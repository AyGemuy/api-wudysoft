import { withApiLog } from "@/lib/apiLogger.cjs";
import fetch from "node-fetch";
class FashionAPI {
  constructor() {
    this.baseURL = "https://change-clothes-api-v2.v2a.ai";
    this.token = null;
    this.headers = {
      "User-Agent": "okhttp/4.10.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
  }
  async login(cred = {}) {
    try {
      console.log("🔐 Login...");
      const data = JSON.stringify({
        email: cred.email || "admin_mobile@heatmob.com",
        password: cred.password || "admin@heatmob.com"
      });
      const res = await fetch(`${this.baseURL}/account/login`, {
        method: "POST",
        headers: this.headers,
        body: data
      });
      const result = await res.json();
      if (result?.success) {
        this.token = result.data?.token;
        console.log("✅ Login success");
        return result;
      } else {
        throw new Error(result?.message || "Login failed");
      }
    } catch (error) {
      console.error("❌ Login error:", error.message);
      throw error;
    }
  }
  async segment(img) {
    try {
      console.log("🎯 Segment...");
      if (!this.token) await this.login();
      const imgData = await this.processImg(img);
      const data = JSON.stringify({
        image: imgData
      });
      const res = await fetch(`${this.baseURL}/gateway/segment-v3`, {
        method: "POST",
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        },
        body: data
      });
      const result = await res.json();
      if (result?.success) {
        console.log("✅ Segment job created:", result.data);
        return await this.pollSegment(result.data);
      } else {
        throw new Error(result?.message || "Segment failed");
      }
    } catch (error) {
      console.error("❌ Segment error:", error.message);
      throw error;
    }
  }
  async pollSegment(jobId, max = 30) {
    try {
      console.log("🔄 Poll segment...");
      for (let i = 1; i <= max; i++) {
        console.log(`⏳ Attempt ${i}/${max}`);
        const res = await fetch(`${this.baseURL}/gateway/segment?s_id=${jobId}`, {
          method: "GET",
          headers: {
            ...this.headers,
            authorization: `Bearer ${this.token}`
          }
        });
        const result = await res.json();
        if (result?.data?.status === "FINISHED") {
          console.log("✅ Segment done");
          const targetMask = await this.downloadBase64(result.data.result?.[0]);
          const targetImage = await this.downloadBase64(result.data.result?.[1]);
          const sourceMask = await this.downloadBase64(result.data.result?.[2]);
          const sourceImage = await this.downloadBase64(result.data.result?.[3]);
          return {
            targetMask: targetMask,
            targetImage: targetImage,
            sourceMask: sourceMask,
            sourceImage: sourceImage
          };
        }
        await new Promise(r => setTimeout(r, 2e3));
      }
      throw new Error("Poll timeout");
    } catch (error) {
      console.error("❌ Poll error:", error.message);
      throw error;
    }
  }
  async downloadBase64(url) {
    if (!url) return "";
    try {
      console.log(`📥 Download: ${url}`);
      const res = await fetch(url);
      const arrBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      return buf.toString("base64");
    } catch (error) {
      console.error(`❌ Download failed: ${url}`, error.message);
      return "";
    }
  }
  async swap({
    source,
    target,
    ...rest
  }) {
    try {
      console.log("👕 Swap...");
      if (!this.token) await this.login();
      const segResult = await this.segment(source);
      const clothImg = await this.processImg(target);
      const data = JSON.stringify({
        clothImage: clothImg,
        isSub: false,
        modelImage: segResult.sourceImage,
        modelMaskImage: segResult.sourceMask,
        selectedSize: "Normal",
        templateId: "",
        ...rest
      });
      console.log("📤 Send swap...");
      const res = await fetch(`${this.baseURL}/gateway/change-outfit-v2`, {
        method: "POST",
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        },
        body: data
      });
      const result = await res.json();
      console.log("Final result:", result);
      if (result?.success && result.data?.specialId) {
        console.log("✅ Swap job created:", result.data.specialId);
        console.log(`📊 Queue: ${result.data.jobsInQueue}, Time: ${result.data.timeLeft}s`);
        return await this.pollSwap(result.data.specialId);
      } else {
        throw new Error(result?.message || "Swap failed");
      }
    } catch (error) {
      console.error("❌ Swap error:", error.message);
      throw error;
    }
  }
  async pollSwap(specialId, max = 50) {
    try {
      console.log("🔄 Poll swap...");
      for (let i = 1; i <= max; i++) {
        console.log(`⏳ Attempt ${i}/${max}`);
        const res = await fetch(`${this.baseURL}/gateway/listen-image?specialId=${specialId}`, {
          method: "GET",
          headers: {
            ...this.headers,
            authorization: `Bearer ${this.token}`
          }
        });
        const result = await res.json();
        console.log("Final result:", result);
        if (result?.data?.status === "FINISHED") {
          console.log("✅ Swap done");
          return result;
        } else if (result?.data?.status === "FAILED") {
          throw new Error(result?.data?.error || "Swap job failed");
        }
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("Swap poll timeout");
    } catch (error) {
      console.error("❌ Swap poll error:", error.message);
      throw error;
    }
  }
  async outfit({
    query,
    ...rest
  }) {
    try {
      console.log("👔 Outfit...");
      if (!this.token) await this.login();
      const q = query || "Men";
      const res = await fetch(`${this.baseURL}/gateway/outfits?freeText=${encodeURIComponent(q)}`, {
        method: "GET",
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        }
      });
      const result = await res.json();
      console.log("✅ Outfit done");
      return result;
    } catch (error) {
      console.error("❌ Outfit error:", error.message);
      throw error;
    }
  }
  async processImg(img) {
    try {
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log("🌐 Download img...");
          const res = await fetch(img);
          const arrBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrBuf);
          return buf.toString("base64");
        } else if (img.startsWith("data:")) {
          return img.split(",")[1];
        } else {
          return img;
        }
      } else if (Buffer.isBuffer(img)) {
        return img.toString("base64");
      }
      return img;
    } catch (error) {
      console.error("❌ Img process error:", error.message);
      throw error;
    }
  }
}
async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["segment", "swap", "outfit"]
    });
  }
  const api = new FashionAPI();
  try {
    let response;
    switch (action) {
      case "segment":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'segment'."
          });
        }
        response = await api.segment(params.image);
        break;
      case "swap":
        if (!params.source || !params.target) {
          return res.status(400).json({
            error: "Parameter 'source' dan 'target' wajib diisi untuk action 'swap'."
          });
        }
        response = await api.swap(params);
        break;
      case "outfit":
        response = await api.outfit(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["segment", "swap", "outfit"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server.",
      action: action
    });
  }
}

export default withApiLog(handler);
