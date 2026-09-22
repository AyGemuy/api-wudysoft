import axios from "axios";
class AnonymousAI {
  constructor() {
    try {
      this.baseURL = "https://www.freeanonymousai.com";
      this.timeout = 6e4;
      this.http = axios.create({
        baseURL: this.baseURL,
        timeout: this.timeout,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://www.freeanonymousai.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.freeanonymousai.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.tools = new Set(["auto", "general-chat", "conversational-ai", "brainstorm", "research", "explain", "ai-chat-free", "generative-ai-free", "text-to-image", "ai-image-generator", "ai-art-generator", "headshot", "background-remover", "image-upscaler", "photo-restoration", "ai-logo-generator", "product-photography", "ai-meme", "ai-sticker", "ai-tattoo", "ai-interior", "ai-fashion", "ai-thumbnail", "ai-3d-modeling", "ai-graphics-generator", "ai-painting-generator", "anime-generator", "photo-to-cartoon", "coloring-page-generator", "colorize-photo", "text-to-video", "image-to-video", "text-to-speech", "transcription", "podcast-summariser", "code-assistant", "python-ai", "data-analysis-ai", "ai-website-planner", "bug-fixer", "code-explainer", "sql-generator", "regex-generator", "code-converter", "unit-test-generator", "json-formatter", "api-docs", "sql-optimizer", "commit-message", "dockerfile", "excel-formula-generator", "email-writer", "resume-builder", "cover-letter", "blog-draft", "ad-copy", "seo-meta", "paraphrasing-tool", "grammar-checker", "social-caption", "hashtag-generator", "product-description", "story-writer", "linkedin-post", "ai-detector", "ai-humanizer", "plagiarism-checker", "hook-generator", "twitter-post", "instagram-caption", "tiktok-caption", "viral-content", "personal-statement-generator", "thesis-statement-generator", "character-name-generator", "essay-writer", "essay-detector", "ai-copywriting", "poem-generator", "lyrics-generator", "speech-writer", "keyword-research", "keyword-difficulty", "serp-preview", "title-generator", "meta-description-generator", "faq-generator", "blog-outline", "content-brief", "schema-markup", "youtube-title", "youtube-description", "youtube-script", "interview-questions", "star-answer", "linkedin-headline", "linkedin-summary", "resume-bullet", "professional-bio", "elevator-pitch", "resignation-letter-generator", "recommendation-letter-generator", "marketing-report", "sentiment-analysis", "market-research-report", "marketing-strategy", "google-ads", "facebook-ads", "landing-page", "cold-email", "sales-email", "product-launch", "ai-grant-assistant", "business-plan", "swot-analysis", "value-proposition", "startup-idea", "press-release", "job-description-generator", "mission-statement-generator", "invoice-generator", "slogan-generator", "pdf-summariser", "youtube-summariser", "meeting-notes", "translator", "document-qa", "text-summariser", "math-solver", "business-name", "study-notes", "flashcard-generator", "mind-map", "action-items", "research-summarizer", "study-planner", "qr-code-generator", "username-generator", "password-generator", "citation-generator", "apa-citation-generator", "mla-citation-generator", "bibliography-generator", "domain-name-generator", "app-name-generator", "recipe-generator", "workout-planner", "meal-planner"]);
      console.log("[LOG] Instance AnonymousAI berhasil diinisialisasi.");
    } catch (err) {
      console.error(`[ERROR] Gagal inisialisasi constructor: ${err?.message}`);
    }
  }
  vTool(name) {
    try {
      console.log(`[LOG] Memvalidasi tool: "${name}"`);
      const valid = this.tools.has(name) ? name : "auto";
      console.log(`[LOG] Tool disetujui: "${valid}"`);
      return valid;
    } catch (err) {
      console.error(`[ERROR] Gagal validasi tool: ${err?.message}`);
      return "auto";
    }
  }
  dMime(buf) {
    try {
      if (!buf || buf.length < 4) return "application/octet-stream";
      if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
      if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return "image/png";
      if (buf[0] === 71 && buf[1] === 73 && buf[2] === 70) return "image/gif";
      if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70) return "image/webp";
      if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) return "application/pdf";
      return "image/jpeg";
    } catch (err) {
      console.error(`[ERROR] Gagal deteksi mime type: ${err?.message}`);
      return "image/jpeg";
    }
  }
  async pMed(item) {
    try {
      console.log("[LOG] Memproses item media...");
      if (Buffer.isBuffer(item)) {
        return {
          mimeType: this.dMime(item),
          data: item.toString("base64")
        };
      }
      if (item?.data && typeof item.data === "string") {
        const cleanData = item.data.includes("base64,") ? item.data.split("base64,")?.[1] : item.data;
        return {
          mimeType: item?.mimeType || "image/jpeg",
          data: cleanData
        };
      }
      if (typeof item === "string") {
        if (/^https?:\/\//i.test(item)) {
          console.log(`[LOG] Mengunduh media dari URL: ${item}`);
          const res = await axios.get(item, {
            responseType: "arraybuffer"
          });
          const buf = Buffer.from(res?.data);
          const mimeType = res?.headers?.["content-type"] || this.dMime(buf);
          return {
            mimeType: mimeType.split(";")?.[0] || "image/jpeg",
            data: buf.toString("base64")
          };
        }
        if (/^data:([^;]+);base64,(.+)$/is.test(item)) {
          const match = item.match(/^data:([^;]+);base64,(.+)$/is);
          return {
            mimeType: match?.[1] || "image/jpeg",
            data: match?.[2] || ""
          };
        }
        const buf = Buffer.from(item, "base64");
        return {
          mimeType: this.dMime(buf),
          data: item
        };
      }
      return null;
    } catch (err) {
      console.error(`[ERROR] Gagal memproses media: ${err?.message}`);
      return null;
    }
  }
  async generate({
    tool,
    prompt,
    media,
    history,
    ...rest
  }) {
    try {
      console.log(`[LOG] Memulai request generate | Prompt: "${prompt || ""}"`);
      const activeTool = this.vTool(tool);
      const hist = Array.isArray(history) ? history : [];
      const attachments = [];
      const mediaList = Array.isArray(media) ? media : media ? [media] : [];
      for (const item of mediaList) {
        const parsed = await this.pMed(item);
        if (parsed?.data) {
          attachments.push(parsed);
        }
      }
      console.log(`[LOG] Total attachments siap: ${attachments.length}`);
      const payload = {
        prompt: prompt || "",
        tool: activeTool,
        attachments: attachments,
        history: hist,
        thinking: rest?.thinking ?? false,
        search: rest?.search ?? true,
        stream: rest?.stream ?? true,
        ...rest
      };
      console.log("[LOG] Mengirim request ke endpoint /api/generate...");
      const response = await this.http.post("/api/generate", payload);
      const resData = response?.data;
      console.log(`[LOG] Respon diterima | Type: ${resData?.type || "unknown"} | Model: ${resData?.model || "unknown"}`);
      if (prompt) {
        hist.push({
          role: "user",
          content: prompt
        });
      }
      if (resData?.output && resData?.type === "text") {
        hist.push({
          role: "assistant",
          content: resData.output
        });
      }
      return {
        success: true,
        ...resData,
        history: hist
      };
    } catch (err) {
      console.error(`[ERROR] Gagal saat eksekusi generate: ${err?.response?.data || err?.message}`);
      return {
        success: false,
        error: err?.response?.data || err?.message || "Unknown error",
        output: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AnonymousAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}