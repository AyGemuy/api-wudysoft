import axios from "axios";
class AudioToText {
  constructor() {
    this.baseUrl = "https://pgxqjqkmvprwhsuuolda.supabase.co/functions/v1";
    this.storageUrl = "https://pgxqjqkmvprwhsuuolda.storage.supabase.co/storage/v1/upload/resumable";
    this.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneHFqcWttdnByd2hzdXVvbGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMTM4NzcsImV4cCI6MjA2MTU4OTg3N30.qGW5OG_b9aPAFd3kFbjm1gWFg8I0i_rvvLn9a3dPPTY";
    this.headers = {
      authorization: `Bearer ${this.token}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: "https://audiototext.com",
      referer: "https://audiototext.com/"
    };
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async resolve(media) {
    try {
      if (Buffer.isBuffer(media)) {
        console.log("🔹 Media detected: Buffer");
        return media;
      }
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          console.log("🔹 Media detected: URL. Downloading...");
          const response = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data);
        }
        if (media.startsWith("data:")) {
          console.log("🔹 Media detected: Base64 URI");
          return Buffer.from(media.split(",")[1], "base64");
        }
        console.log("🔹 Media detected: Base64 String");
        return Buffer.from(media, "base64");
      }
      throw new Error("Format media tidak didukung");
    } catch (error) {
      throw new Error(`Gagal memproses media: ${error?.message}`);
    }
  }
  encMeta(key, value) {
    return `${key} ${Buffer.from(value).toString("base64")}`;
  }
  async upload(buffer, fileName) {
    try {
      console.log(`🚀 Uploading ${fileName} (${buffer.length} bytes)...`);
      const mimeType = "audio/wav";
      const metadata = [this.encMeta("bucketName", "user-temp-files"), this.encMeta("objectName", fileName), this.encMeta("contentType", mimeType), this.encMeta("cacheControl", "3600")].join(",");
      const response = await axios.post(this.storageUrl, buffer, {
        headers: {
          ...this.headers,
          "tus-resumable": "1.0.0",
          "upload-length": buffer.length,
          "upload-metadata": metadata,
          "content-type": "application/offset+octet-stream",
          "x-upsert": "true"
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      console.log("✅ Upload success:", response.status);
      return fileName;
    } catch (error) {
      console.error("❌ Upload failed:", error?.response?.data || error?.message);
      throw error;
    }
  }
  async init(filePath) {
    try {
      console.log("⚙️ Initiating transcription...");
      const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload = {
        filePath: filePath,
        isAssembly: true,
        anonymousSessionId: sessionId
      };
      const response = await axios.post(`${this.baseUrl}/att-initiate-transcription`, payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      const orderId = response?.data?.orderId;
      if (!orderId) throw new Error("Order ID tidak ditemukan dalam response");
      console.log(`sc Order ID created: ${orderId}`);
      return orderId;
    } catch (error) {
      console.error("❌ Init failed:", error?.response?.data || error?.message);
      throw error;
    }
  }
  async poll(orderId) {
    try {
      console.log("⏳ Polling status...");
      let attempts = 0;
      while (true) {
        attempts++;
        const delay = Math.floor(Math.random() * (3e3 - 60 + 1) + 60);
        await this.sleep(delay);
        const response = await axios.post(`${this.baseUrl}/get-att-transcription-order`, {
          orderId: orderId
        }, {
          headers: {
            ...this.headers,
            "content-type": "application/json"
          }
        });
        const data = response?.data || {};
        const status = data?.status || "unknown";
        console.log(`   Attempt ${attempts} [${delay}ms]: ${status}`);
        if (status === "completed") {
          console.log("🎉 Transcription completed!");
          return data;
        }
        if (status === "error" || data?.success === false) {
          throw new Error(data?.error || "Transcription failed during polling");
        }
      }
    } catch (error) {
      console.error("❌ Polling error:", error?.response?.data || error?.message);
      throw error;
    }
  }
  async generate({
    input,
    lang = "id",
    ...rest
  }) {
    try {
      const buffer = await this.resolve(input);
      const timestamp = Date.now();
      const fileName = `audio_${timestamp}.wav`;
      await this.upload(buffer, fileName);
      const orderId = await this.init(fileName);
      const result = await this.poll(orderId);
      return {
        text: result?.blocks?.map(b => b.text).join(" ") || "",
        ...result
      };
    } catch (error) {
      console.error("💥 Transcribe Process Halted");
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new AudioToText();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}