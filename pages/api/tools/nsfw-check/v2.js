import vm from "vm";
import axios from "axios";
class NSFWDetector {
  constructor() {
    this.CDN_URLS = {
      tfjs: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js",
      nsfwjs: "https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js",
      jpegDecoder: "https://cdn.jsdelivr.net/npm/jpeg-js@0.4.4/lib/decoder.js",
      model: "https://cdn.jsdelivr.net/gh/infinitered/nsfwjs@master/models/mobilenet_v2_mid/"
    };
    this.cachedContext = null;
    this.cachedModel = null;
    this.LABEL_IDS = {
      Drawing: 0,
      Neutral: 1,
      Sexy: 2,
      Hentai: 3,
      Porn: 4
    };
  }
  async axiosFetchPolyfill(url, options = {}) {
    try {
      console.log(`[FetchPolyfill] Meminta URL: ${url}`);
      const method = options.method || "GET";
      const headers = options.headers || {};
      const response = await axios({
        url: url.toString(),
        method: method,
        headers: headers,
        data: options.body,
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      console.log(`[FetchPolyfill] Berhasil mengambil data dari: ${url} (${buffer.length} bytes)`);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        headers: {
          get: h => response.headers[h.toLowerCase()]
        },
        json: async () => JSON.parse(buffer.toString("utf8")),
        text: async () => buffer.toString("utf8"),
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      };
    } catch (error) {
      console.error(`[FetchPolyfill] Gagal mengambil URL ${url}:`, error.message);
      throw error;
    }
  }
  async setupVM() {
    try {
      if (this.cachedContext && this.cachedModel) {
        console.log("[SetupVM] Menggunakan context dan model dari cache.");
        return {
          context: this.cachedContext,
          model: this.cachedModel
        };
      }
      console.log("[SetupVM] Mengunduh skrip pustaka CDN (TFJS, NSFWJS, JpegDecoder)...");
      const [tfjsCode, nsfwjsCode, jpegCode] = await Promise.all([axios.get(this.CDN_URLS.tfjs).then(res => res.data), axios.get(this.CDN_URLS.nsfwjs).then(res => res.data), axios.get(this.CDN_URLS.jpegDecoder).then(res => res.data)]);
      console.log("[SetupVM] Selesai mengunduh skrip CDN.");
      const createMockElement = () => ({
        style: {},
        setAttribute: () => {},
        getContext: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
      });
      const mockDocument = {
        createElement: createMockElement,
        getElementById: createMockElement,
        getElementsByTagName: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        head: {},
        body: {}
      };
      const sandbox = {
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        Buffer: Buffer,
        Uint8Array: Uint8Array,
        Int32Array: Int32Array,
        Float32Array: Float32Array,
        ArrayBuffer: ArrayBuffer,
        atob: str => Buffer.from(str, "base64").toString("binary"),
        btoa: str => Buffer.from(str, "binary").toString("base64"),
        TextEncoder: globalThis.TextEncoder,
        TextDecoder: globalThis.TextDecoder,
        performance: globalThis.performance || {
          now: () => Date.now()
        },
        document: mockDocument,
        location: {
          href: "http://localhost/"
        },
        navigator: {
          userAgent: "Mozilla/5.0"
        },
        fetch: this.axiosFetchPolyfill.bind(this)
      };
      sandbox.window = sandbox;
      sandbox.self = sandbox;
      sandbox.global = sandbox;
      sandbox.globalThis = sandbox;
      console.log("[SetupVM] Membuat VM context baru...");
      const context = vm.createContext(sandbox);
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (typeof args[0] === "string" && (args[0].includes("already registered") || args[0].includes("Reusing existing backend") || args[0].includes("Overwriting the platform") || args[0].includes("Error when getting WebGL context") || args[0].includes("Initialization of backend webgl failed"))) {
          return;
        }
        originalWarn(...args);
      };
      console.log("[SetupVM] Menjalankan kode TFJS dan NSFWJS di dalam VM...");
      vm.runInContext(tfjsCode, context);
      vm.runInContext(nsfwjsCode, context);
      console.log("[SetupVM] Mengatur backend TensorFlow.js ke 'cpu'...");
      await context.tf.setBackend("cpu");
      await context.tf.ready();
      console.warn = originalWarn;
      context.module = {
        exports: {}
      };
      context.exports = context.module.exports;
      vm.runInContext(`(function(module, exports) { ${jpegCode} \n})(module, exports);`, context);
      context.jpegDecode = context.module.exports;
      console.log("[SetupVM] Memuat model NSFWJS Graph...");
      this.cachedModel = await context.nsfwjs.load(this.CDN_URLS.model, {
        size: 224,
        type: "graph"
      });
      this.cachedContext = context;
      console.log("[SetupVM] VM dan Model berhasil disiapkan.");
      return {
        context: this.cachedContext,
        model: this.cachedModel
      };
    } catch (error) {
      console.error("[SetupVM] Terjadi kesalahan saat menyiapkan VM:", error.message);
      throw error;
    }
  }
  bufferToTensor3D(jpegBuffer, context) {
    try {
      console.log("[BufferToTensor3D] Mendekode buffer JPEG...");
      const {
        tf,
        jpegDecode
      } = context;
      const decoded = jpegDecode(jpegBuffer, {
        useTArray: true
      });
      const numChannels = 3;
      const numPixels = decoded.width * decoded.height;
      const values = new Int32Array(numPixels * numChannels);
      for (let i = 0; i < numPixels; i++) {
        for (let c = 0; c < numChannels; ++c) {
          values[i * numChannels + c] = decoded.data[i * 4 + c];
        }
      }
      console.log(`[BufferToTensor3D] Membuat tensor 3D dengan ukuran: ${decoded.height}x${decoded.width}`);
      return tf.tensor3d(values, [decoded.height, decoded.width, numChannels], "int32");
    } catch (error) {
      console.error("[BufferToTensor3D] Gagal mengonversi buffer ke tensor:", error.message);
      throw error;
    }
  }
  async checkNSFW({
    image,
    threshold = .6
  }) {
    let tensor = null;
    try {
      console.log(`[CheckNSFW] Memulai pemeriksaan gambar: ${image}`);
      const {
        context,
        model
      } = await this.setupVM();
      console.log("[CheckNSFW] Mengunduh gambar sumber...");
      const imgResponse = await axios.get(image, {
        responseType: "arraybuffer",
        timeout: 15e3
      });
      let imgBuffer = Buffer.from(imgResponse.data);
      const isJpeg = imgBuffer[0] === 255 && imgBuffer[1] === 216;
      if (!isJpeg) {
        console.log("[CheckNSFW] Gambar bukan format JPEG, mengonversi via weserv.nl...");
        const convertUrl = `https://images.weserv.nl/?url=${encodeURIComponent(image)}&output=jpg`;
        const convertedResponse = await axios.get(convertUrl, {
          responseType: "arraybuffer",
          timeout: 15e3
        });
        imgBuffer = Buffer.from(convertedResponse.data);
        console.log("[CheckNSFW] Konversi gambar ke JPEG selesai.");
      } else {
        console.log("[CheckNSFW] Gambar sudah berformat JPEG.");
      }
      tensor = this.bufferToTensor3D(imgBuffer, context);
      console.log("[CheckNSFW] Melakukan klasifikasi gambar menggunakan model...");
      const predictions = await model.classify(tensor);
      console.log("[CheckNSFW] Klasifikasi selesai. Hasil:", predictions);
      const scores = {};
      predictions.forEach(p => {
        scores[p.className] = p.probability;
      });
      const porn = scores["Porn"] || 0;
      const hentai = scores["Hentai"] || 0;
      const sexy = scores["Sexy"] || 0;
      const isNsfw = porn >= .03 || hentai >= .05 || sexy >= .08 || porn + hentai + sexy >= .1;
      const topPrediction = predictions.reduce((prev, current) => current.probability > prev.probability ? current : prev, predictions[0]);
      let labelName = topPrediction.className;
      let labelId = this.LABEL_IDS[labelName] ?? 0;
      let confidence = topPrediction.probability;
      if (isNsfw) {
        const riskyCategories = ["Porn", "Hentai", "Sexy"];
        let maxRiskScore = -1;
        let maxRiskLabel = labelName;
        riskyCategories.forEach(cat => {
          if ((scores[cat] || 0) > maxRiskScore) {
            maxRiskScore = scores[cat];
            maxRiskLabel = cat;
          }
        });
        if (maxRiskScore >= .03) {
          labelName = maxRiskLabel;
          labelId = this.LABEL_IDS[labelName] ?? labelId;
          confidence = maxRiskScore;
        }
      }
      return {
        success: true,
        code: 200,
        result: {
          isNsfw: isNsfw,
          labelName: labelName,
          labelId: labelId,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          scores: scores,
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
      };
    } catch (error) {
      console.error("[CheckNSFW] Terjadi kesalahan saat memeriksa NSFW:", error.message);
      return {
        success: false,
        code: 500,
        error: error.message
      };
    } finally {
      if (tensor) {
        console.log("[CheckNSFW] Membersihkan tensor dari memori...");
        tensor.dispose();
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new NSFWDetector();
  try {
    const data = await api.checkNSFW(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}