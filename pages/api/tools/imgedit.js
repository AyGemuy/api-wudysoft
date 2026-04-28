import axios from "axios";
import FormData from "form-data";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class ImgEditAI {
  constructor() {
    this._cfg = {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "null",
        "cache-control": "no-cache",
        origin: "https://imgedit.ai",
        referer: "https://imgedit.ai/background-remover",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      endpoints: {
        upload: {
          main: "https://uploads.imgedit.ai/api/v1/draw-cf/upload",
          extra: "https://upload.imgedit.ai/api/v1/files/uploadImgs"
        },
        generate: "https://imgedit.ai/api/v1/draw-cf/generate",
        polling: {
          cf: "https://imgedit.ai/api/v1/draw-cf",
          ts: "https://imgedit.ai/api/v1/draw-task"
        },
        removebg: {
          url: "https://imgedit.ai/api/v1/draw-task/al",
          template: "segment_common",
          task_params: "background",
          layout: 7,
          image_key_type: 3
        },
        swap: {
          url: "https://imgedit.ai/api/v1/al/mergeImageFace",
          image_key_type: 3
        },
        eraser: {
          url: "https://imgedit.ai/api/v1/draw-task/volc",
          action: 64,
          layout: 6,
          image_key_type: 3,
          task_params: {
            steps: 10,
            strength: 1,
            scale: 2,
            seed: 9092272922366
          }
        },
        unblur: {
          url: "https://imgedit.ai/api/v1/draw-task/volc",
          action: 66,
          layout: 6,
          image_key_type: 3
        },
        restoration: {
          url: "https://imgedit.ai/api/v1/draw-task/volc",
          action: 66,
          layout: 6,
          image_key_type: 3
        },
        removewm: {
          url: "https://imgedit.ai/api/v1/draw-task/volc",
          action: 64,
          layout: 6,
          image_key_type: 3,
          task_params: {
            steps: 10,
            strength: 1,
            scale: 2,
            seed: 4307273307106
          }
        },
        signbg: {
          url: "https://imgedit.ai/api/v1/draw-task/al",
          template: "segment_common",
          task_params: "background",
          layout: 7,
          image_key_type: 3
        },
        img2img: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "anime",
          seed: "4744204771974",
          style_id: 42
        },
        txt2img: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "mx",
          style_id: 1,
          seed: "9526208109331",
          params: ["1024", "1024", "1", "78", "15", "65", "1", "1"],
          count: 1
        },
        sketch: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "sketch_v2",
          seed: "2537242552554",
          style_id: 16
        },
        cartoon: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "anime",
          seed: "4559242669858",
          style_id: 42
        },
        animation: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "anime",
          seed: "2925273045621",
          style_id: 37
        },
        replace: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "mx",
          style_id: 2,
          seed: "5078242823894",
          content: "add girl",
          count: 1,
          params: ["1024", "1024", "1", "78", "81", "119", "0.6", "1"]
        },
        expand: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "expand",
          seed: "1429242956493",
          params: ["0", "233.33333333333331", "0", "233.33333333333331"]
        },
        background: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "commerce_v3",
          style_id: 1003,
          seed: "4628243108000",
          content: "men",
          count: 1,
          params: ["181"],
          image_key_type: 3
        },
        filter: {
          url: "https://imgedit.ai/api/v1/draw-cf/generate",
          template: "style_transfer_v2",
          seed: "2160243405486",
          count: 1,
          params: ["0.5", "67", "57"],
          image_key_type: 3
        },
        nano: {
          url: "https://imgedit.ai/api/v1/draw-task/nano",
          layout: 9,
          action: 145,
          image_key_type: 3,
          prompt: "Add cat"
        }
      },
      crypto: {
        key: "651cc172938d5b7799a23ac245e539a6",
        iv: "35e5cd2d684e5c65"
      }
    };
    this.ekey = this._generateEkey();
  }
  _generateEkey() {
    const l1 = "adghko45678";
    const l2 = "012389abcduiopmn";
    const rn = (min, max) => Math.floor(Math.random() * (max - min) + min);
    const rc = (len, chars) => Array.from({
      length: len
    }, () => chars[Math.random() * chars.length | 0]).join("");
    return `${rn(7e3, 1e4)}${rc(4, l1)}${rc(4, l2)}${rn(1e3, 4e3)}`;
  }
  _decrypt(data) {
    if (!data) return;
    try {
      const key = CryptoJS.enc.Utf8.parse(this._cfg.crypto.key);
      const iv = CryptoJS.enc.Utf8.parse(this._cfg.crypto.iv);
      return JSON.parse(CryptoJS.AES.decrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8));
    } catch {
      return undefined;
    }
  }
  async _pollingCf(taskId) {
    const {
      cf
    } = this._cfg.endpoints.polling;
    while (true) {
      try {
        console.log("[POLLING CF] Task ID:", taskId);
        const {
          data
        } = await axios.get(`${cf}/${taskId}?ekey=${this.ekey}&soft_id=imgedit_web`, {
          headers: this._cfg.headers
        });
        const result = this._decrypt(data.data);
        console.log("Decrypt:", result);
        if (result?.code === 0 && result?.msg === "Success" && result?.data?.images) return result.data.images;
        console.log("[POLLING CF] Menunggu...");
        await new Promise(r => setTimeout(r, 2e3));
      } catch (error) {
        console.error("[POLLING CF] Error:", error.message);
        await new Promise(r => setTimeout(r, 2e3));
      }
    }
  }
  async _pollingTs(taskId) {
    const {
      ts
    } = this._cfg.endpoints.polling;
    while (true) {
      try {
        console.log("[POLLING TS] Task ID:", taskId);
        const {
          data
        } = await axios.get(`${ts}/${taskId}?ekey=${this.ekey}&soft_id=imgedit_web`, {
          headers: this._cfg.headers
        });
        const result = this._decrypt(data.data);
        console.log("Decrypt:", result);
        if (result?.code === 0 && result?.msg === "Success" && result?.data?.images) return result.data.images;
        console.log("[POLLING TS] Menunggu...");
        await new Promise(r => setTimeout(r, 2e3));
      } catch (error) {
        console.error("[POLLING TS] Error:", error.message);
        await new Promise(r => setTimeout(r, 2e3));
      }
    }
  }
  async _getImage(url) {
    try {
      console.log("[FETCH] Mengambil gambar dari:", url);
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"];
      if (!contentType.startsWith("image/")) throw new Error("Bukan file gambar.");
      return {
        buffer: response.data,
        mime: contentType
      };
    } catch (error) {
      console.error("[FETCH] Error:", error.message);
      throw error;
    }
  }
  async upload({
    imageUrl,
    extra = false
  }) {
    try {
      console.log("[UPLOAD] Mengunggah gambar...");
      const {
        buffer,
        mime
      } = await this._getImage(imageUrl);
      const ext = mime.split("/")[1];
      const {
        upload
      } = this._cfg.endpoints;
      if (extra) {
        const base64Image = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
        const {
          data
        } = await axios.post(`${upload.extra}?ekey=${this.ekey}&soft_id=imgedit_web`, {
          files_base64: base64Image
        }, {
          headers: this._cfg.headers
        });
        const dec = this._decrypt(data.data);
        if (dec?.code === 0 && dec?.msg === "Success" && dec?.data?.paths) {
          console.log("[UPLOAD] Berhasil:", dec.data.paths[0]);
          return dec.data.paths[0];
        }
        throw new Error("Respon upload tidak valid");
      } else {
        const form = new FormData();
        form.append("image", Buffer.from(buffer), {
          filename: `upload.${ext}`,
          contentType: mime
        });
        const {
          data
        } = await axios.post(`${upload.main}?ekey=${this.ekey}&soft_id=imgedit_web`, form, {
          headers: {
            ...this._cfg.headers,
            ...form.getHeaders()
          }
        });
        const dec = this._decrypt(data.data);
        if (dec?.code === 0 && dec?.msg === "Success" && dec?.data?.image) {
          console.log("[UPLOAD] Berhasil:", dec.data.image);
          return dec.data.image;
        }
        throw new Error("Respon upload tidak valid");
      }
    } catch (error) {
      console.error("[UPLOAD] Error:", error.message);
      throw error;
    }
  }
  async removebg({
    imageUrl,
    layout,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.removebg;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[REMOVE BG] Menghapus latar belakang...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        image_key_type: cfg.image_key_type,
        extra_image_key: extra_image_key,
        template: cfg.template,
        task_params: cfg.task_params,
        layout: layout ?? cfg.layout
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[REMOVE BG] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon removebg tidak valid");
    } catch (error) {
      console.error("[REMOVE BG] Error:", error.message);
      throw error;
    }
  }
  async img2img({
    imageUrl,
    template,
    seed,
    style_id,
    extra = false,
    ...params
  }) {
    try {
      const cfg = this._cfg.endpoints.img2img;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[IMG2IMG] Membuat gambar...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: template ?? cfg.template,
        seed: seed ?? cfg.seed,
        style_id: style_id ?? cfg.style_id,
        extra_image_key: extra_image_key,
        ...params
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[IMG2IMG] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon img2img tidak valid");
    } catch (error) {
      console.error("[IMG2IMG] Error:", error.message);
      throw error;
    }
  }
  async txt2img({
    template,
    content = "men",
    style_id,
    seed
  }) {
    try {
      const cfg = this._cfg.endpoints.txt2img;
      console.log("[TXT2IMG] Membuat gambar dari teks...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: template ?? cfg.template,
        style_id: style_id ?? cfg.style_id,
        content: content,
        seed: seed ?? cfg.seed,
        params: cfg.params,
        count: cfg.count
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[TXT2IMG] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon txt2img tidak valid");
    } catch (error) {
      console.error("[TXT2IMG] Error:", error.message);
      throw error;
    }
  }
  async swap({
    markUrl,
    imageUrl,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.swap;
      console.log("[SWAP] Menggabungkan wajah...");
      const mark_image_url = await this.upload({
        imageUrl: markUrl,
        extra: extra
      });
      const extra_image_url = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        image_key_type: cfg.image_key_type,
        mark_image_url: mark_image_url,
        extra_image_url: extra_image_url
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SWAP] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon swap tidak valid");
    } catch (error) {
      console.error("[SWAP] Error:", error.message);
      throw error;
    }
  }
  async sketch({
    imageUrl,
    seed,
    style_id,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.sketch;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[SKETCH] Menghasilkan sketsa...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: cfg.template,
        seed: seed ?? cfg.seed,
        style_id: style_id ?? cfg.style_id,
        extra_image_key: extra_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SKETCH] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon sketch tidak valid");
    } catch (error) {
      console.error("[SKETCH] Error:", error.message);
      throw error;
    }
  }
  async cartoon({
    imageUrl,
    seed,
    style_id,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.cartoon;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[CARTOON] Menghasilkan kartun...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: cfg.template,
        seed: seed ?? cfg.seed,
        style_id: style_id ?? cfg.style_id,
        extra_image_key: extra_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[CARTOON] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon cartoon tidak valid");
    } catch (error) {
      console.error("[CARTOON] Error:", error.message);
      throw error;
    }
  }
  async replace({
    content,
    maskUrl,
    imageUrl,
    seed,
    style_id,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.replace;
      const mask_image_key = await this.upload({
        imageUrl: maskUrl,
        extra: extra
      });
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[REPLACE] Mengganti objek...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: cfg.template,
        style_id: style_id ?? cfg.style_id,
        content: content ?? cfg.content,
        count: cfg.count,
        seed: seed ?? cfg.seed,
        params: cfg.params,
        mask_image_key: mask_image_key,
        extra_image_key: extra_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[REPLACE] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon replace tidak valid");
    } catch (error) {
      console.error("[REPLACE] Error:", error.message);
      throw error;
    }
  }
  async expand({
    imageUrl,
    seed,
    params,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.expand;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[EXPAND] Memperluas gambar...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: cfg.template,
        extra_image_key: extra_image_key,
        params: params ?? cfg.params,
        seed: seed ?? cfg.seed
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[EXPAND] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon expand tidak valid");
    } catch (error) {
      console.error("[EXPAND] Error:", error.message);
      throw error;
    }
  }
  async background({
    imageUrl,
    seed,
    style_id,
    content,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.background;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[BACKGROUND] Mengganti background...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        image_key_type: cfg.image_key_type,
        template: cfg.template,
        style_id: style_id ?? cfg.style_id,
        content: content ?? cfg.content,
        count: cfg.count,
        seed: seed ?? cfg.seed,
        params: cfg.params,
        extra_image_key: extra_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[BACKGROUND] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon background tidak valid");
    } catch (error) {
      console.error("[BACKGROUND] Error:", error.message);
      throw error;
    }
  }
  async filter({
    imageUrl,
    seed,
    params,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.filter;
      const bg_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[FILTER] Menerapkan filter...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        image_key_type: cfg.image_key_type,
        template: cfg.template,
        count: cfg.count,
        seed: seed ?? cfg.seed,
        params: params ?? cfg.params,
        bg_image_key: bg_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[FILTER] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon filter tidak valid");
    } catch (error) {
      console.error("[FILTER] Error:", error.message);
      throw error;
    }
  }
  async eraser({
    imageUrl,
    markUrl,
    layout,
    steps,
    strength,
    scale,
    seed,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.eraser;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      const mark_image_key = await this.upload({
        imageUrl: markUrl,
        extra: extra
      });
      console.log("[ERASER] Menghapus objek...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        extra_image_key: extra_image_key,
        mark_image_key: mark_image_key,
        image_key_type: cfg.image_key_type,
        action: cfg.action,
        layout: layout ?? cfg.layout,
        task_params: {
          steps: steps ?? cfg.task_params.steps,
          strength: strength ?? cfg.task_params.strength,
          scale: scale ?? cfg.task_params.scale,
          seed: seed ?? cfg.task_params.seed
        }
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[ERASER] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon eraser tidak valid");
    } catch (error) {
      console.error("[ERASER] Error:", error.message);
      throw error;
    }
  }
  async animation({
    imageUrl,
    seed,
    style_id,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.animation;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[ANIMATION] Menghasilkan animasi...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        template: cfg.template,
        seed: seed ?? cfg.seed,
        style_id: style_id ?? cfg.style_id,
        extra_image_key: extra_image_key
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[ANIMATION] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon animation tidak valid");
    } catch (error) {
      console.error("[ANIMATION] Error:", error.message);
      throw error;
    }
  }
  async unblur({
    imageUrl,
    layout,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.unblur;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[UNBLUR] Menghapus blur...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        extra_image_key: extra_image_key,
        image_key_type: cfg.image_key_type,
        action: cfg.action,
        layout: layout ?? cfg.layout
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[UNBLUR] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon unblur tidak valid");
    } catch (error) {
      console.error("[UNBLUR] Error:", error.message);
      throw error;
    }
  }
  async removewm({
    imageUrl,
    markUrl,
    layout,
    task_params,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.removewm;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      const mark_image_key = await this.upload({
        imageUrl: markUrl,
        extra: extra
      });
      console.log("[REMOVE WM] Menghapus watermark...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        extra_image_key: extra_image_key,
        mark_image_key: mark_image_key,
        image_key_type: cfg.image_key_type,
        action: cfg.action,
        layout: layout ?? cfg.layout,
        task_params: task_params ?? cfg.task_params
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[REMOVE WM] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon removewm tidak valid");
    } catch (error) {
      console.error("[REMOVE WM] Error:", error.message);
      throw error;
    }
  }
  async restoration({
    imageUrl,
    layout,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.restoration;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[RESTORATION] Memulihkan gambar...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        extra_image_key: extra_image_key,
        image_key_type: cfg.image_key_type,
        action: cfg.action,
        layout: layout ?? cfg.layout
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[RESTORATION] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon restoration tidak valid");
    } catch (error) {
      console.error("[RESTORATION] Error:", error.message);
      throw error;
    }
  }
  async signbg({
    imageUrl,
    layout,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.signbg;
      const extra_image_key = await this.upload({
        imageUrl: imageUrl,
        extra: extra
      });
      console.log("[SIGN BG] Menandai background...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        image_key_type: cfg.image_key_type,
        extra_image_key: extra_image_key,
        template: cfg.template,
        task_params: cfg.task_params,
        layout: layout ?? cfg.layout
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.task_id) {
        console.log("[SIGN BG] Task ID:", result.data.task_id);
        return await this._pollingCf(result.data.task_id);
      }
      throw new Error("Respon signbg tidak valid");
    } catch (error) {
      console.error("[SIGN BG] Error:", error.message);
      throw error;
    }
  }
  async nano({
    imageUrl,
    imageUrls,
    prompt,
    layout,
    action,
    extra = false
  }) {
    try {
      const cfg = this._cfg.endpoints.nano;
      const urls = [...imageUrl ? [imageUrl] : [], ...Array.isArray(imageUrls) ? imageUrls : []];
      if (!urls.length) throw new Error("Minimal satu imageUrl diperlukan");
      console.log(`[NANO] Mengupload ${urls.length} gambar secara sequential...`);
      const input_image = [];
      for (const url of urls) {
        const key = await this.upload({
          imageUrl: url,
          extra: extra
        });
        input_image.push(key);
      }
      console.log("[NANO] Mengirim task nano...");
      const {
        data
      } = await axios.post(`${cfg.url}?ekey=${this.ekey}&soft_id=imgedit_web`, {
        layout: layout ?? cfg.layout,
        action: action ?? cfg.action,
        prompt_text: prompt ?? cfg.prompt,
        image_key_type: cfg.image_key_type,
        task_params: {
          input_image: input_image
        }
      }, {
        headers: this._cfg.headers
      });
      const result = this._decrypt(data.data);
      console.log("Decrypt:", result);
      if (result?.code === 0 && result?.msg === "Success" && result?.data?.serial_no) {
        console.log("[NANO] Task ID:", result.data.serial_no);
        return await this._pollingTs(result.data.serial_no);
      }
      throw new Error("Respon nano tidak valid");
    } catch (error) {
      console.error("[NANO] Error:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  const imgEdit = new ImgEditAI();
  const actionSchema = {
    animation: ["imageUrl"],
    background: ["imageUrl"],
    cartoon: ["imageUrl"],
    eraser: ["imageUrl", "markUrl"],
    expand: ["imageUrl"],
    filter: ["imageUrl"],
    img2img: ["imageUrl"],
    nano: ["imageUrl atau imageUrls"],
    removebg: ["imageUrl"],
    removewm: ["imageUrl", "markUrl"],
    replace: ["imageUrl", "maskUrl"],
    restoration: ["imageUrl"],
    signbg: ["imageUrl"],
    sketch: ["imageUrl"],
    swap: ["imageUrl", "markUrl"],
    txt2img: ["content"],
    unblur: ["imageUrl"],
    upload: ["imageUrl"]
  };
  const sendError = (message, status = 400) => {
    return res.status(status).json({
      success: false,
      message: message,
      available_actions: actionSchema
    });
  };
  const sendImageBuffer = result => {
    if (!result || !result.length) {
      return sendError("Gagal memproses gambar: Data tidak valid dari AI.", 500);
    }
    try {
      const base64Data = result[0].includes(",") ? result[0].split(",")[1] : result[0];
      const imageBuffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } catch (e) {
      return sendError("Gagal melakukan encoding gambar.", 500);
    }
  };
  try {
    if (!action) {
      return sendError("Parameter 'action' diperlukan.");
    }
    const lowerAction = action.toLowerCase();
    let result;
    switch (lowerAction) {
      case "animation":
      case "background":
      case "cartoon":
      case "expand":
      case "filter":
      case "img2img":
      case "removebg":
      case "restoration":
      case "signbg":
      case "sketch":
      case "unblur":
      case "upload":
        if (!params.imageUrl) return sendError(`Aksi '${lowerAction}' memerlukan parameter 'imageUrl'.`);
        result = await imgEdit[lowerAction](params);
        if (lowerAction === "upload") return res.status(200).json({
          success: true,
          result: result
        });
        return sendImageBuffer(result);
      case "eraser":
      case "removewm":
      case "swap":
        if (!params.imageUrl || !params.markUrl) {
          return sendError(`Aksi '${lowerAction}' memerlukan 'imageUrl' DAN 'markUrl'.`);
        }
        result = await imgEdit[lowerAction](params);
        return sendImageBuffer(result);
      case "replace":
        if (!params.imageUrl || !params.maskUrl) {
          return sendError("Aksi 'replace' memerlukan 'imageUrl' DAN 'maskUrl'.");
        }
        result = await imgEdit.replace(params);
        return sendImageBuffer(result);
      case "nano":
        if (!params.imageUrl && (!params.imageUrls || !params.imageUrls.length)) {
          return sendError("Aksi 'nano' memerlukan 'imageUrl' atau array 'imageUrls'.");
        }
        result = await imgEdit.nano(params);
        return sendImageBuffer(result);
      case "txt2img":
        if (!params.content) return sendError("Aksi 'txt2img' memerlukan parameter 'content' (prompt teks).");
        result = await imgEdit.txt2img(params);
        return sendImageBuffer(result);
      default:
        return sendError(`Action '${action}' tidak dikenali.`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
}