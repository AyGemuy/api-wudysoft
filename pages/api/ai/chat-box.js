import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class ChatBoxAI {
  constructor(options = {}) {
    try {
      console.log("[Init] Inisialisasi instance ChatBoxAI...");
      this.baseUrl = options?.baseUrl || "https://chat-box.ai/app/api/v1";
      this.fp = options?.deviceFingerprint || this.genFp();
      this.defaultModelId = "88cc1733-9cf1-4652-a7be-f9a6dbe01737";
      console.log(`[Init] Berhasil. Fingerprint: ${this.fp}`);
    } catch (err) {
      console.log(`[Error] Inisialisasi constructor gagal: ${err?.message || err}`);
    }
  }
  genFp() {
    try {
      console.log("[Fingerprint] Menghasilkan device fingerprint acak...");
      return crypto.randomBytes(16).toString("hex");
    } catch (err) {
      console.log(`[Error] Gagal membuat fingerprint: ${err?.message || err}`);
      return "9cb03efb1db69eb0e1ebbf4c58322db8";
    }
  }
  hdr(custom = {}) {
    try {
      console.log("[Header] Menyusun request headers...");
      return {
        accept: "text/event-stream",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://chat-box.ai",
        referer: "https://chat-box.ai/app",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-app-theme": "dark",
        "x-device-fingerprint": this.fp,
        "x-user-origin-source": "ads",
        ...custom
      };
    } catch (err) {
      console.log(`[Error] Gagal menyusun headers: ${err?.message || err}`);
      return {};
    }
  }
  async buf(input) {
    try {
      console.log("[Media] Memproses item media...");
      if (!input) {
        throw new Error("Data input media tidak boleh kosong.");
      }
      if (Buffer.isBuffer(input)) {
        console.log("[Media] Input terdeteksi berupa Buffer.");
        return {
          buffer: input,
          filename: "upload.png",
          mime_type: "image/png"
        };
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          console.log(`[Media] Mengunduh media dari URL: ${trimmed}`);
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer"
          });
          const mime = res.headers?.["content-type"] || "image/png";
          const ext = mime.split("/")?.[1]?.slice(0, 4) || "png";
          return {
            buffer: Buffer.from(res.data),
            filename: `upload.${ext === "jpeg" ? "jpg" : ext}`,
            mime_type: mime
          };
        }
        if (trimmed.startsWith("data:")) {
          console.log("[Media] Parsing Data-URI Base64...");
          const commaIdx = trimmed.indexOf(",");
          if (commaIdx === -1) throw new Error("Format Data URI Base64 tidak valid.");
          const meta = trimmed.slice(5, commaIdx);
          const raw = trimmed.slice(commaIdx + 1);
          const mime = meta.split(";")?.[0] || "image/png";
          const ext = mime.split("/")?.[1]?.slice(0, 4) || "png";
          return {
            buffer: Buffer.from(raw, "base64"),
            filename: `upload.${ext === "jpeg" ? "jpg" : ext}`,
            mime_type: mime
          };
        }
        console.log("[Media] Parsing string Base64 murni...");
        return {
          buffer: Buffer.from(trimmed, "base64"),
          filename: "upload.png",
          mime_type: "image/png"
        };
      }
      throw new Error("Format media tidak didukung. Kirimkan URL, Base64, atau Buffer.");
    } catch (err) {
      console.log(`[Error] Gagal memproses media item: ${err?.message || err}`);
      throw err;
    }
  }
  async att(form, mediaInput, fieldName = "file") {
    try {
      console.log("[Multi-Media] Memeriksa antrean media untuk auto-push...");
      if (!mediaInput) return 0;
      const list = Array.isArray(mediaInput) ? mediaInput : [mediaInput];
      let counter = 0;
      for (const item of list) {
        if (!item) continue;
        console.log(`[Multi-Media] Auto-pushing item #${counter + 1} ke FormData...`);
        const resolved = await this.buf(item);
        form.append(fieldName, resolved.buffer, {
          filename: `${counter}_${resolved.filename}`,
          contentType: resolved.mime_type
        });
        counter++;
      }
      console.log(`[Multi-Media] Sukses memasukkan total ${counter} file.`);
      return counter;
    } catch (err) {
      console.log(`[Error] Gagal saat eksekusi auto-push multi media: ${err?.message || err}`);
      throw err;
    }
  }
  par(rawSse) {
    try {
      console.log("[Parser] Parsing seluruh event SSE menggunakan slice tanpa replace...");
      if (typeof rawSse !== "string") {
        throw new Error("Respons SSE harus bertipe data string.");
      }
      const lines = rawSse.split("\n");
      const chunks = [];
      const textChunks = [];
      let connectedData = null;
      let completeData = null;
      let chatTitle = null;
      let currentEvent = null;
      let currentId = null;
      for (const line of lines) {
        const l = line.trim();
        if (!l) {
          currentEvent = null;
          currentId = null;
          continue;
        }
        if (l.startsWith("event:")) {
          currentEvent = l.slice(6).trim();
          continue;
        }
        if (l.startsWith("id:")) {
          currentId = l.slice(3).trim();
          continue;
        }
        if (l.startsWith("data:")) {
          const dataStr = l.slice(5).trim();
          try {
            const payload = JSON.parse(dataStr);
            const evType = currentEvent || payload?.event?.type || "unknown";
            chunks.push({
              event: evType,
              id: currentId || null,
              data: payload?.event || payload
            });
            if (evType === "connected" || payload?.event?.type === "connected") {
              connectedData = payload?.event;
            } else if (evType === "chunk" || payload?.event?.type === "chunk") {
              const text = payload?.event?.content || "";
              if (text) textChunks.push(text);
            } else if (evType === "complete" || payload?.event?.type === "complete") {
              completeData = payload?.event;
            } else if (evType === "chat_title" || payload?.event?.type === "chat_title") {
              chatTitle = payload?.event?.content || null;
            }
          } catch (_) {}
        }
      }
      console.log(`[Parser] Selesai. ${chunks.length} parsed event chunks berhasil ditangkap.`);
      return {
        connected: connectedData,
        complete: completeData,
        chat_title: chatTitle,
        chunks: chunks,
        chunks_text: textChunks.join("")
      };
    } catch (err) {
      console.log(`[Error] Parsing SSE gagal: ${err?.message || err}`);
      throw err;
    }
  }
  async req(url, form) {
    try {
      console.log(`[Network] Mengirim request ke: ${url}`);
      if (!url || !form) {
        throw new Error("URL dan instance FormData wajib disertakan.");
      }
      const headers = {
        ...this.hdr(),
        ...form.getHeaders()
      };
      const response = await axios.post(url, form, {
        headers: headers,
        responseType: "text"
      });
      return this.par(response?.data || "");
    } catch (err) {
      console.log(`[Error] Request HTTP gagal: ${err?.response?.data || err?.message || err}`);
      throw err;
    }
  }
  async generate({
    mode = "chat",
    prompt,
    media,
    image,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Memulai eksekusi generate()...");
      if (!mode || typeof mode !== "string") {
        throw new Error("Parameter 'mode' wajib diisi (pilih: 'chat', 'gen', atau 'filter').");
      }
      const selected = mode.toLowerCase();
      if (selected === "chat") {
        return await this.chat({
          prompt: prompt,
          media: media,
          image: image,
          ...rest
        });
      }
      if (selected === "gen" || selected === "generate" || selected === "image") {
        return await this.generateImage({
          prompt: prompt,
          media: media,
          image: image,
          ...rest
        });
      }
      if (selected === "filter") {
        return await this.applyFilter({
          prompt: prompt,
          media: media,
          image: image,
          ...rest
        });
      }
      throw new Error(`Mode '${mode}' tidak dikenal. Pilihan yang valid: 'chat', 'gen', atau 'filter'.`);
    } catch (err) {
      console.log(`[Error] generate() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Terjadi kesalahan sistem pada generate"
        }
      };
    }
  }
  async chat({
    prompt,
    media,
    image,
    model_id,
    room_id,
    room_type,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Memulai eksekusi chat...");
      const message = (prompt || rest?.message || "").trim();
      const mediaFiles = media || image || rest?.files || rest?.file;
      if (!message && (!mediaFiles || Array.isArray(mediaFiles) && mediaFiles.length === 0)) {
        throw new Error("Chat memerlukan setidaknya salah satu parameter: 'prompt', 'media', atau 'image'.");
      }
      const form = new FormData();
      const activeModelId = model_id || rest?.modelId || this.defaultModelId;
      const activeRoomType = room_type || rest?.roomType || "WebSearch";
      form.append("message", message);
      form.append("modelId", activeModelId);
      form.append("roomType", activeRoomType);
      if (room_id || rest?.roomId) {
        form.append("roomId", room_id || rest?.roomId);
      }
      await this.att(form, mediaFiles, "file");
      const sseResult = await this.req(`${this.baseUrl}/chat/stream`, form);
      const full = sseResult?.complete?.fullMessage;
      return {
        status: true,
        result: {
          room_id: sseResult?.complete?.roomId || sseResult?.connected?.roomId || null,
          message_id: full?.id || null,
          response: full?.message || sseResult?.chunks_text || "",
          title: sseResult?.chat_title || null,
          model: full?.model?.name || "AI Chat",
          token_usage: {
            prompt_tokens: full?.webSearch?.tokenUsage?.promptTokens || 0,
            completion_tokens: full?.webSearch?.tokenUsage?.completionTokens || 0,
            total_tokens: full?.webSearch?.tokenUsage?.totalTokens || 0
          },
          chunks: sseResult?.chunks || [],
          created_at: full?.createdAt || new Date().toISOString()
        }
      };
    } catch (err) {
      console.log(`[Error] chat() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal mengirim pesan chat"
        }
      };
    }
  }
  async generateImage({
    prompt,
    media,
    image,
    room_id,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Memulai eksekusi generateImage...");
      const message = (prompt || rest?.message || "").trim();
      if (!message) {
        throw new Error("Parameter 'prompt' wajib diisi untuk melakukan generate gambar.");
      }
      const form = new FormData();
      form.append("message", message);
      if (room_id || rest?.roomId) {
        form.append("roomId", room_id || rest?.roomId);
      }
      const mediaFiles = media || image || rest?.files || rest?.file;
      await this.att(form, mediaFiles, "file");
      const sseResult = await this.req(`${this.baseUrl}/images/generate-image`, form);
      const complete = sseResult?.complete || {};
      return {
        status: true,
        result: {
          room_id: complete?.roomId || sseResult?.connected?.roomId || null,
          message_id: complete?.messageId || null,
          file_id: complete?.fileId || null,
          image_url: complete?.imageUrl || null,
          thumbnail_desktop_url: complete?.thumbnailDesktopUrl || null,
          thumbnail_mobile_url: complete?.thumbnailMobileUrl || null,
          thumbnail_sidebar_url: complete?.thumbnailSidebarUrl || null,
          chunks: sseResult?.chunks || [],
          created_at: complete?.timestamp || new Date().toISOString()
        }
      };
    } catch (err) {
      console.log(`[Error] generateImage() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal melakukan generate gambar"
        }
      };
    }
  }
  async applyFilter({
    filter = "ANIME",
    media,
    image,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Memulai eksekusi applyFilter...");
      const mediaFiles = media || image || rest?.files || rest?.file;
      if (!mediaFiles || Array.isArray(mediaFiles) && mediaFiles.length === 0) {
        throw new Error("Parameter 'media' atau 'image' wajib disertakan untuk apply filter.");
      }
      const filterName = (filter || rest?.name || "ANIME").toUpperCase().trim();
      if (!filterName) {
        throw new Error("Parameter 'filter' tidak boleh bernilai kosong.");
      }
      const form = new FormData();
      form.append("name", filterName);
      await this.att(form, mediaFiles, "file");
      const sseResult = await this.req(`${this.baseUrl}/images/apply-filter`, form);
      const complete = sseResult?.complete || {};
      return {
        status: true,
        result: {
          room_id: complete?.roomId || sseResult?.connected?.roomId || null,
          message_id: complete?.messageId || null,
          file_id: complete?.fileId || null,
          filter_name: filterName,
          image_url: complete?.imageUrl || null,
          thumbnail_desktop_url: complete?.thumbnailDesktopUrl || null,
          thumbnail_mobile_url: complete?.thumbnailMobileUrl || null,
          thumbnail_sidebar_url: complete?.thumbnailSidebarUrl || null,
          chunks: sseResult?.chunks || [],
          created_at: complete?.timestamp || new Date().toISOString()
        }
      };
    } catch (err) {
      console.log(`[Error] applyFilter() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal menerapkan filter pada gambar"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ChatBoxAI();
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