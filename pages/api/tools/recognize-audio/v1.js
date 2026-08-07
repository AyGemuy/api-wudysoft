import axios from "axios";
import crypto from "crypto";
import https from "https";
import {
  spawn
} from "child_process";
class FourierEngine {
  constructor(len) {
    try {
      this.len = len;
      this.bitRevTable = new Uint32Array(len);
      let bound = 1;
      let shift = len >> 1;
      while (bound < len) {
        for (let idx = 0; idx < bound; idx++) {
          this.bitRevTable[idx + bound] = this.bitRevTable[idx] + shift;
        }
        bound <<= 1;
        shift >>= 1;
      }
      this.sineArray = new Float64Array(len);
      this.cosineArray = new Float64Array(len);
      for (let idx = 0; idx < len; idx++) {
        this.sineArray[idx] = Math.sin(2 * Math.PI * idx / len);
        this.cosineArray[idx] = Math.cos(2 * Math.PI * idx / len);
      }
    } catch (err) {
      console.log(`[FourierEngine Init] ${err.message}`);
    }
  }
  compute(realPart, imagPart) {
    try {
      const size = this.len;
      for (let idx = 0; idx < size; idx++) {
        const revIdx = this.bitRevTable[idx];
        if (idx < revIdx) {
          let tempVal = realPart[idx];
          realPart[idx] = realPart[revIdx];
          realPart[revIdx] = tempVal;
          tempVal = imagPart[idx];
          imagPart[idx] = imagPart[revIdx];
          imagPart[revIdx] = tempVal;
        }
      }
      for (let step = 2; step <= size; step <<= 1) {
        const halfStep = step >> 1;
        const phaseStep = size / step;
        for (let idx = 0; idx < size; idx += step) {
          for (let jdx = idx, kdx = 0; jdx < idx + halfStep; jdx++, kdx += phaseStep) {
            const kLink = jdx + halfStep;
            const realRot = realPart[kLink] * this.cosineArray[kdx] + imagPart[kLink] * this.sineArray[kdx];
            const imagRot = -realPart[kLink] * this.sineArray[kdx] + imagPart[kLink] * this.cosineArray[kdx];
            realPart[kLink] = realPart[jdx] - realRot;
            imagPart[kLink] = imagPart[jdx] - imagRot;
            realPart[jdx] += realRot;
            imagPart[jdx] += imagRot;
          }
        }
      }
    } catch (err) {
      console.log(`[FourierEngine Compute] ${err.message}`);
    }
  }
  processReal(outputBuf, inputBuf) {
    try {
      const realPart = new Float64Array(inputBuf);
      const imagPart = new Float64Array(this.len);
      this.compute(realPart, imagPart);
      for (let idx = 0; idx < this.len; idx++) {
        outputBuf[2 * idx] = realPart[idx];
        outputBuf[2 * idx + 1] = imagPart[idx];
      }
    } catch (err) {
      console.log(`[FourierEngine Transform] ${err.message}`);
    }
  }
}
class SoundMatch {
  constructor() {
    this.agentString = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Shazam/15.0.0";
    this.customAgent = new https.Agent({
      rejectUnauthorized: false
    });
    this.settings = {
      locale: "en-US",
      territory: "GB",
      tz: "Europe/London",
      clipLimit: 12,
      peakLimit: 255,
      retryCount: 3,
      backoffMs: 1e3
    };
  }
  _makeToken() {
    try {
      console.log("[Process] Membuat token pengenal unik...");
      return {
        status: true,
        result: crypto.randomUUID().toUpperCase()
      };
    } catch (e) {
      console.log(`[Process] Gagal membuat token: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _checksum(buf) {
    try {
      console.log("[Process] Memvalidasi checksum CRC32...");
      let crc = ~0;
      for (let idx = 0; idx < buf.length; idx++) {
        crc ^= buf[idx];
        for (let k = 0; k < 8; k++) {
          crc = crc & 1 ? crc >>> 1 ^ 3988292384 : crc >>> 1;
        }
      }
      return {
        status: true,
        result: (crc ^ ~0) >>> 0
      };
    } catch (e) {
      console.log(`[Process] Gagal memvalidasi CRC32: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _dataUri(sig) {
    try {
      console.log("[Process] Membentuk payload URI data base64...");
      const uri = "data:audio/vnd.shazam.sig;base64," + Buffer.from(sig).toString("base64");
      return {
        status: true,
        result: uri
      };
    } catch (e) {
      console.log(`[Process] Gagal merakit URI: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _snakeKeys(source) {
    try {
      if (source === null || typeof source !== "object") return source;
      if (Array.isArray(source)) return source.map(item => this._snakeKeys(item));
      const out = {};
      for (const key of Object.keys(source)) {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        out[snakeKey] = this._snakeKeys(source[key]);
      }
      return out;
    } catch (e) {
      console.log(`[Process] Gagal memformat ke snake_case: ${e.message}`);
      return source;
    }
  }
  async _loadAudio(audioSource) {
    try {
      console.log("[Process] Mendeteksi tipe masukan audio...");
      if (Buffer.isBuffer(audioSource)) {
        console.log("[Process] Masukan terdeteksi langsung sebagai tipe Buffer.");
        return {
          status: true,
          result: audioSource
        };
      }
      if (typeof audioSource === "string") {
        if (/^https?:\/\//i.test(audioSource)) {
          console.log(`[Process] Mengunduh berkas audio: ${audioSource}`);
          const res = await axios.get(audioSource, {
            responseType: "arraybuffer",
            httpsAgent: this.customAgent,
            headers: {
              "user-agent": this.agentString
            }
          });
          return {
            status: true,
            result: Buffer.from(res.data)
          };
        }
        if (/^[A-Za-z0-9+/=]+$/i.test(audioSource)) {
          console.log("[Process] Mengurai string Base64 ke dalam bentuk Buffer.");
          return {
            status: true,
            result: Buffer.from(audioSource, "base64")
          };
        }
      }
      return {
        status: false,
        result: {
          error: "Format masukan audio tidak dikenal."
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal mengunduh/memuat audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _pcmDecode(audioBuffer) {
    try {
      console.log("[Process] Memproses dekode aliran audio...");
      if (!audioBuffer || audioBuffer.length === 0) {
        return {
          status: false,
          result: {
            error: "Buffer audio tidak boleh kosong."
          }
        };
      }
      const ffmpegResult = await new Promise(resolve => {
        try {
          const childProcess = spawn("ffmpeg", ["-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "pipe:1"]);
          const dataBuffers = [];
          childProcess.stdout.on("data", chunk => dataBuffers.push(chunk));
          childProcess.on("close", code => {
            if (code === 0) {
              const combinedBuffer = Buffer.concat(dataBuffers);
              resolve({
                status: true,
                result: new Int16Array(combinedBuffer.buffer, combinedBuffer.byteOffset, combinedBuffer.byteLength >> 1)
              });
            } else {
              resolve({
                status: false,
                error: `FFmpeg keluar dengan kode error ${code}`
              });
            }
          });
          childProcess.on("error", err => resolve({
            status: false,
            error: err.message
          }));
          childProcess.stdin.write(audioBuffer);
          childProcess.stdin.end();
        } catch (e) {
          resolve({
            status: false,
            error: e.message
          });
        }
      });
      if (ffmpegResult.status) {
        console.log("[Process] Aliran audio berhasil diubah ke PCM via FFmpeg.");
        return {
          status: true,
          result: ffmpegResult.result
        };
      }
      console.log("[Process] FFmpeg mati/gagal. Mencoba mengurai WAV secara mentah...");
      const hasRiffHeader = audioBuffer.toString("latin1", 0, 4) === "RIFF";
      if (!hasRiffHeader) {
        console.log("[Process] Format WAV tidak didukung tanpa FFmpeg. Mengambil data mentah PCM.");
        return {
          status: true,
          result: new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength >> 1)
        };
      }
      let cursor = 12;
      let audioPayloadOffset = -1;
      let audioPayloadSize = 0;
      while (cursor < audioBuffer.length - 8) {
        const id = audioBuffer.toString("latin1", cursor, cursor + 4);
        const size = audioBuffer.readUInt32LE(cursor + 4);
        if (id === "data") {
          audioPayloadOffset = cursor + 8;
          audioPayloadSize = size;
          break;
        }
        cursor += 8 + size + (size & 1);
      }
      if (audioPayloadOffset < 0) {
        return {
          status: true,
          result: new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength >> 1)
        };
      }
      const evenPayloadSize = audioPayloadSize & ~1;
      return {
        status: true,
        result: new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset + audioPayloadOffset, evenPayloadSize >> 1)
      };
    } catch (e) {
      console.log(`[Process] Gagal mengurai masukan audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _makeSignature(sampleInt16, sampleRate = 16e3) {
    try {
      console.log("[Process] Mengalkulasi tanda tangan frekuensi audio...");
      if (!sampleInt16 || sampleInt16.length < 2048) {
        return {
          status: false,
          result: {
            error: "Durasi sampel audio terlalu pendek."
          }
        };
      }
      const clipDuration = sampleInt16.length / sampleRate;
      if (clipDuration > 12 * 3) {
        const offsetSamples = Math.floor(sampleRate * (clipDuration / 2 - 6));
        sampleInt16 = sampleInt16.subarray(Math.min(offsetSamples, sampleInt16.length));
      }
      const winLen = 2048;
      const binCount = 1025;
      const overlapStep = 128;
      const hannWindow = new Float64Array(winLen);
      for (let idx = 0; idx < winLen; idx++) {
        hannWindow[idx] = .5 - .5 * Math.cos(2 * Math.PI * (idx + 1) / (winLen + 1));
      }
      const circularBuffer = new Int16Array(winLen);
      const magHistory = Array.from({
        length: 256
      }, () => new Float64Array(binCount).fill(1e-10));
      const peakHistory = Array.from({
        length: 256
      }, () => new Float64Array(binCount).fill(0));
      const filteredPeaks = {
        0: [],
        1: [],
        2: [],
        3: []
      };
      const f = new FourierEngine(winLen);
      const input = new Float64Array(winLen);
      const out = new Float64Array(winLen * 2);
      const getFrequencyBand = hz => {
        if (hz > 250 && hz < 520) return 0;
        if (hz > 520 && hz < 1450) return 1;
        if (hz > 1450 && hz < 3500) return 2;
        if (hz > 3500 && hz < 5500) return 3;
        return -1;
      };
      let circularIndex = 0;
      let spectrumIndex = 0;
      const totalPeaks = () => filteredPeaks[0].length + filteredPeaks[1].length + filteredPeaks[2].length + filteredPeaks[3].length;
      for (let ni = 0; ni + overlapStep <= sampleInt16.length; ni += overlapStep) {
        const durSecs = spectrumIndex * overlapStep / sampleRate;
        if (spectrumIndex && durSecs >= this.settings.clipLimit && totalPeaks() >= this.settings.peakLimit) break;
        for (let idx = 0; idx < overlapStep; idx++) circularBuffer[(circularIndex + idx) % winLen] = sampleInt16[ni + idx];
        circularIndex = (circularIndex + overlapStep) % winLen;
        const excerpt = new Float64Array(winLen);
        for (let idx = 0; idx < winLen; idx++) excerpt[idx] = circularBuffer[(circularIndex + idx) % winLen];
        for (let idx = 0; idx < winLen; idx++) input[idx] = excerpt[idx] * hannWindow[idx];
        f.processReal(out, input);
        const mag = new Float64Array(binCount);
        for (let idx = 0; idx < binCount; idx++) {
          const r = out[2 * idx],
            im = out[2 * idx + 1];
          mag[idx] = (r * r + im * im) / (1 << 17);
          if (mag[idx] < 1e-10) mag[idx] = 1e-10;
        }
        magHistory[spectrumIndex % 256] = mag;
        const originLast = new Float64Array(binCount);
        for (let idx = 0; idx < binCount; idx++) {
          let m = mag[idx];
          if (idx + 1 < binCount && mag[idx + 1] > m) m = mag[idx + 1];
          if (idx + 2 < binCount && mag[idx + 2] > m) m = mag[idx + 2];
          originLast[idx] = m;
        } {
          const posS = spectrumIndex % 256;
          const s1 = peakHistory[(posS - 1 + 256) % 256];
          const s3 = peakHistory[(posS - 3 + 256) % 256];
          const s6 = peakHistory[(posS - 6 + 256) % 256];
          for (let idx = 0; idx < binCount; idx++) {
            const r0 = originLast[idx];
            s1[idx] = Math.max(r0, s1[idx]);
            s3[idx] = Math.max(s1[idx], s3[idx]);
            s6[idx] = Math.max(s3[idx], s6[idx]);
          }
        }
        peakHistory[spectrumIndex % 256] = Float64Array.from(originLast);
        if (spectrumIndex >= 50) {
          const pos = spectrumIndex % 256;
          const f46 = magHistory[(pos - 46 + 256) % 256];
          const s49 = peakHistory[(pos - 49 + 256) % 256];
          const SRing = off => peakHistory[(pos + off + 256) % 256];
          for (let b = 10; b < 1015; b++) {
            if (f46[b] >= 1 / 64 && f46[b] >= s49[b - 1]) {
              let maxN = 0;
              for (const o of [-10, -7, -4, -3, 1, 2, 5, 8]) {
                const v = s49[b + o];
                if (v > maxN) maxN = v;
              }
              if (f46[b] <= maxN) continue;
              let maxO = maxN;
              for (const o of [-53, -45, 165, 172, 179, 186, 193, 200, 214, 221, 228, 235, 242, 249]) {
                const v = SRing(o)[b - 1];
                if (v > maxO) maxO = v;
              }
              if (f46[b] <= maxO) continue;
              const peakMag = Math.log(Math.max(1 / 64, f46[b])) * 1477.3 + 6144;
              const pmBefore = Math.log(Math.max(1 / 64, f46[b - 1])) * 1477.3 + 6144;
              const pmAfter = Math.log(Math.max(1 / 64, f46[b + 1])) * 1477.3 + 6144;
              const var1 = peakMag * 2 - pmBefore - pmAfter;
              if (var1 <= 0) continue;
              const var2 = (pmAfter - pmBefore) * 32 / var1;
              const corr = b * 64 + var2;
              const hz = corr * (16e3 / 2 / 1024 / 64);
              const band = getFrequencyBand(hz);
              if (band < 0) continue;
              filteredPeaks[band].push({
                fft: spectrumIndex - 46,
                mag: peakMag | 0,
                bin: corr | 0
              });
              if (totalPeaks() >= this.settings.peakLimit) break;
            }
          }
        }
        spectrumIndex++;
      }
      for (const b of [0, 1, 2, 3]) filteredPeaks[b].sort((x, y) => x.fft - y.fft);
      const validBands = [0, 1, 2, 3].filter(b => filteredPeaks[b].length > 0);
      const signatureChunks = [];
      for (const band of validBands) {
        const pk = filteredPeaks[band];
        const list = [];
        let lastFft = 0;
        for (const p of pk) {
          if (p.fft - lastFft >= 255) {
            const buf = Buffer.alloc(5);
            buf[0] = 255;
            buf.writeUInt32LE(p.fft, 1);
            list.push(buf);
            lastFft = p.fft;
          }
          const rec = Buffer.alloc(5);
          rec[0] = p.fft - lastFft;
          rec.writeUInt16LE(p.mag, 1);
          rec.writeUInt16LE(p.bin, 3);
          list.push(rec);
          lastFft = p.fft;
        }
        const payload = Buffer.concat(list);
        const head = Buffer.alloc(8);
        head.writeUInt32LE(1610809408 + band, 0);
        head.writeUInt32LE(payload.length, 4);
        signatureChunks.push(head, payload);
        const pad = (-payload.length % 4 + 4) % 4;
        if (pad) signatureChunks.push(Buffer.alloc(pad));
      }
      const mergedSignaturePayload = Buffer.concat(signatureChunks);
      const signatureHeader = Buffer.alloc(48);
      signatureHeader.writeUInt32LE(3405653376, 0);
      signatureHeader.writeUInt32LE(2484182016, 12);
      signatureHeader.writeUInt32LE(3 << 27, 28);
      const ns = spectrumIndex * overlapStep;
      signatureHeader.writeUInt32LE(ns + sampleRate * .24, 40);
      signatureHeader.writeUInt32LE((15 << 19) + 262144, 44);
      const signatureBody = Buffer.concat([(() => {
        const b4 = Buffer.alloc(4);
        b4.writeUInt32LE(1073741824, 0);
        return b4;
      })(), (() => {
        const b4 = Buffer.alloc(4);
        b4.writeUInt32LE(mergedSignaturePayload.length + 8, 0);
        return b4;
      })(), mergedSignaturePayload]);
      signatureHeader.writeUInt32LE(mergedSignaturePayload.length + 8, 8);
      const fullSignatureData = Buffer.concat([signatureHeader, signatureBody]);
      const calculatedChecksum = this._checksum(fullSignatureData.subarray(8));
      if (!calculatedChecksum.status) return {
        ...calculatedChecksum
      };
      signatureHeader.writeUInt32LE(calculatedChecksum.result, 4);
      return {
        status: true,
        result: Buffer.concat([signatureHeader, signatureBody])
      };
    } catch (e) {
      console.log(`[Process] Gagal mengekstrak tanda tangan audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _fetchWithRetry(fn) {
    try {
      let attempt = 0;
      const max = this.settings.retryCount;
      while (attempt <= max) {
        try {
          const res = await fn();
          return {
            status: true,
            result: res
          };
        } catch (e) {
          attempt++;
          if (attempt > max) {
            return {
              status: false,
              result: {
                error: e.message || "Batas request maksimal terlampaui."
              }
            };
          }
          const delay = this.settings.backoffMs * Math.pow(2, attempt) + Math.random() * 500;
          console.log(`[Process] Permintaan gagal. Mencoba ulang (${attempt}/${max}) dalam ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    } catch (e) {
      console.log(`[Process] Kegagalan retry handler: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _parseRaw(d) {
    try {
      console.log("[Process] Mendekode metadata respons...");
      if (!d) return {
        status: false,
        result: {
          error: "Respons kosong."
        }
      };
      const trackInfo = d.track ?? d.matches?.[0]?.track ?? (d.key && d.title ? d : null);
      if (!trackInfo) return {
        status: false,
        result: {
          error: "Format track tidak kompatibel."
        }
      };
      const firstSection = trackInfo.sections?.[0] ?? {};
      const mappedMetadata = {};
      for (const m of firstSection.metadata || []) {
        if (m.title) mappedMetadata[m.title.toLowerCase()] = m.text;
      }
      const artworkUrls = trackInfo.images || {};
      const providerHub = trackInfo.hub || {};
      const hubActions = providerHub.actions || [];
      const hubOptions = providerHub.options || [];
      const coverImage = artworkUrls.coverarthq || artworkUrls.coverart || firstSection.metapages?.[0]?.image || trackInfo.share?.image || null;
      const applePlayAction = hubActions.find(a => a.type === "applemusicplay");
      const previewUriAction = hubActions.find(a => a.type === "uri");
      const appleLinkAction = hubOptions.flatMap(o => o.actions || []).find(a => a.type === "applemusicopen");
      const allGenres = [];
      const genreField = trackInfo.genres;
      if (genreField) {
        if (typeof genreField === "object") {
          for (const k of Object.keys(genreField))
            if (genreField[k]) allGenres.push(genreField[k]);
        } else {
          allGenres.push(genreField);
        }
      }
      const extractedTrack = {
        ...trackInfo,
        ...mappedMetadata,
        artwork: coverImage,
        genres: allGenres,
        artists: (trackInfo.artists || []).map(a => ({
          ...a
        })),
        appleMusic: {
          ...applePlayAction,
          ...previewUriAction,
          ...appleLinkAction,
          id: applePlayAction?.id || trackInfo.trackadamid || trackInfo.albumadamid || null,
          preview: previewUriAction?.uri || null,
          deeplink: appleLinkAction?.uri || null
        },
        artistPage: trackInfo.subtitle ? `https://www.shazam.com/artist/${encodeURIComponent(trackInfo.subtitle.toLowerCase().replace(/\s+/g, "-"))}` : null,
        share: trackInfo.share?.href || trackInfo.url || null,
        matchedAt: d.timestamp ? new Date(d.timestamp).toISOString() : null
      };
      return {
        status: true,
        result: {
          ...extractedTrack
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal mengonversi struktur respons: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _fetchTrackDetails(key) {
    try {
      console.log(`[Process] Menghubungi repositori eksternal lagu: ${key}`);
      if (!key) return {
        status: false,
        result: {
          error: "Key kosong."
        }
      };
      const url = `https://www.shazam.com/discovery/v5/${this.settings.locale}/${this.settings.territory}/web/-/track/${key}?shazamapiversion=v3&video=v3`;
      const networkResponse = await this._fetchWithRetry(async () => axios.get(url, {
        httpsAgent: this.customAgent,
        headers: {
          "x-shazam-platform": "IPHONE",
          accept: "application/json",
          "accept-language": this.settings.locale,
          "user-agent": this.agentString
        },
        timeout: 2e4
      }));
      if (!networkResponse.status) return {
        ...networkResponse
      };
      const r = networkResponse.result;
      if (r.status !== 200 || !r.data) {
        return {
          status: false,
          result: {
            error: `Server membalas dengan status ${r.status}`
          }
        };
      }
      const extractionResponse = this._parseRaw(r.data);
      return {
        ...extractionResponse
      };
    } catch (e) {
      console.log(`[Process] Gagal mengambil objek track lengkap: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async search({
    audio,
    sr = 16e3,
    related = false,
    ...rest
  }) {
    try {
      console.log("[Process] Memulai pencarian indeks musik...");
      const bufRes = await this._loadAudio(audio);
      if (!bufRes.status) return {
        ...bufRes
      };
      const decRes = await this._pcmDecode(bufRes.result);
      if (!decRes.status) return {
        ...decRes
      };
      const sigRes = this._makeSignature(decRes.result, sr);
      if (!sigRes.status) return {
        ...sigRes
      };
      const sig = sigRes.result;
      const ns = sig.readUInt32LE(40);
      const samplems = Math.round((ns - sr * .24) / sr * 1e3);
      const uriRes = this._dataUri(sig);
      if (!uriRes.status) return {
        ...uriRes
      };
      const body = {
        timezone: this.settings.tz,
        signature: {
          uri: uriRes.result,
          samplems: samplems
        },
        timestamp: Date.now(),
        context: {},
        geolocation: {}
      };
      const uid1 = this._makeToken();
      const uid2 = this._makeToken();
      if (!uid1.status) return {
        ...uid1
      };
      if (!uid2.status) return {
        ...uid2
      };
      const url = `https://amp.shazam.com/discovery/v5/${this.settings.locale}/${this.settings.territory}/iphone/-/tag/${uid1.result}/${uid2.result}` + "?sync=true&webv3=true&sampling=true&connected=" + "&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1" + "&hidelb=true&video=v3";
      console.log("[Process] Mengirim paket sidik jari frekuensi ke Shazam...");
      const networkResponse = await this._fetchWithRetry(async () => axios.post(url, body, {
        headers: {
          "x-shazam-platform": "IPHONE",
          "x-shazam-appversion": "15.0.0",
          accept: "*/*",
          "accept-language": this.settings.locale,
          "accept-encoding": "gzip, deflate",
          "user-agent": this.agentString,
          "content-type": "application/json"
        },
        timeout: 4e4,
        httpsAgent: this.customAgent
      }));
      if (!networkResponse.status) return {
        ...networkResponse
      };
      const r = networkResponse.result;
      if (r.status === 429) {
        return {
          status: false,
          result: {
            error: "Akses dibatasi (HTTP 429)."
          }
        };
      }
      if (r.status !== 200) {
        return {
          status: false,
          result: {
            error: `Server membalas dengan HTTP ${r.status}`
          }
        };
      }
      const extractionResponse = this._parseRaw(r.data);
      if (!extractionResponse.status) {
        return {
          status: false,
          result: {
            error: "Lagu tidak teridentifikasi."
          }
        };
      }
      const match = {
        ...extractionResponse.result
      };
      console.log(`[Process] Ditemukan kecocokan: ${match.title} - ${match.artist}. Merakit profil lengkap...`);
      const extraRes = await this._fetchTrackDetails(match.key).catch(() => null);
      const extraData = extraRes?.status ? {
        ...extraRes.result
      } : null;
      let relatedData = null;
      if (related && match.key) {
        console.log("[Process] Opsi 'related' aktif. Menarik daftar trek serupa...");
        const relatedRes = await this.related(match.key);
        if (relatedRes.status) {
          relatedData = relatedRes.result.results || [];
        }
      }
      const merged = {
        ...match,
        ...extraData || {},
        ...relatedData ? {
          related: relatedData
        } : {},
        ...rest
      };
      const finalData = this._snakeKeys(merged);
      return {
        status: true,
        result: {
          ...finalData
        }
      };
    } catch (e) {
      console.log(`[Process] Kesalahan fatal pada pemrosesan search: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message || "Kesalahan tidak dikenal."
        }
      };
    }
  }
  async related(key, limit = 8) {
    try {
      console.log(`[Process] Mengambil daftar relasi musik serupa untuk ID: ${key}...`);
      if (!key) {
        return {
          status: false,
          result: {
            error: "ID Key tidak boleh kosong."
          }
        };
      }
      const url = `https://cdn.shazam.com/shazam/v3/${this.settings.locale}/${this.settings.territory}/web/-/tracks/track-similarities-id-${encodeURIComponent(key)}?startFrom=0&pageSize=${limit}&connected=&channel=`;
      const networkResponse = await this._fetchWithRetry(async () => axios.get(url, {
        httpsAgent: this.customAgent,
        headers: {
          "x-shazam-platform": "IPHONE",
          accept: "application/json",
          "user-agent": this.agentString
        },
        timeout: 2e4
      }));
      if (!networkResponse.status) return {
        ...networkResponse
      };
      const r = networkResponse.result;
      const rows = (r.data?.tracks || []).map(x => ({
        ...x,
        url: x.share?.href || x.url || null,
        artwork: x.images?.coverarthq || x.images?.default || null,
        trackAdamId: x.trackadamid || null,
        albumAdamId: x.albumadamid || null
      }));
      const finalData = this._snakeKeys({
        key: key,
        count: rows.length,
        results: rows
      });
      return {
        status: true,
        result: {
          ...finalData
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal mengambil relasi musik: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audio) {
    return res.status(400).json({
      error: "Parameter 'audio' diperlukan"
    });
  }
  const api = new SoundMatch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}