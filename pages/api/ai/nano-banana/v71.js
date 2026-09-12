import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class NanoBananaAI {
  constructor() {
    this.key = "nV2t6sQ8JzWyXCMkURa4BEfDq1oZLgMb";
    this.iv = "W9pYdK3eRuBvMzQ2";
    this.pkg = "com.nano.art.ai.generator";
    this.devId = crypto.randomBytes(8).toString("hex");
    this.fcm = `${crypto.randomBytes(16).toString("base64url")}:${crypto.randomBytes(100).toString("base64url")}`;
    this.base = "https://nano-banana.leansoft-ai.com";
    this.cdn = "https://cdn.leansoft-ai.com";
    this.vModes = ["image", "video"];
    this.vStyles = [...this.gen("content_nano_", ["rain", "christmas", "frost", "wc_brazil_1", "wc_argentina_1", "wc_mexico_1", "wc_usa_1", "wc_england_1", "wc_france_1", "cartoon_family_wallpaper", "wallpaper_ocean_1", "ig_profile_1", "champion_1", "bufterfly_1", "god_2", "grass_1", "indian_girl_1", "police_station_1", "collage_warm_romantic", "portrait_bluefantasy", "couple_golden_collage", "poster_pastel_glam", "portrait_warmcollage2", "portrait_neutralveil", "cricket_red_poster", "portrait_blue_dream", "firehero_skull", "portrait_warmcollage", "poster_teal_romantic", "mirrorportrait_warmblue", "portrait_purpledream", "action_inferno_hero", "portrait_amber_moody", "sportsposter_purplegold", "couple_warm_collage", "couple_warmcollage", "portrait_ambercollage", "cricket_teal_poster", "portrait_blue_mirror", "portrait_reflection_blue", "portrait_teal_fantasy", "sportsposter_blueyellow", "soft_portrait", "watercolor_family", "watercolor_duo", "watercolor_pair", "wallpaper_cartoon", "giant_dog", "heaven_love", "wallpaper_1", "cartoon_family", "pastel_easter", "fantasy_easter", "intimate_bedroom", "ballet_dream", "wallpaper_2", "neon_shadow", "bollywood_rain", "red_contrast", "heaven_podcast", "royal_portrait", "carnival", "drawstreet", "bed", "rose3", "rose4", "couple_rain", "couple_rain_1", "rose1", "couple_black_white", "birthday1", "birthday2", "future_baby", "baby_christmas", "ramadan_1", "ramadan_2", "ramadan_3", "stranger_things", "hollywood", "snow_globe", "diwali1", "wantedposter", "tarotcard", "cupid", "wednesday", "holding_face", "graffiti_5", "cupid_1", "hongkong", "girl_portrait_6", "creepy", "cupid_2", "girl_portrait_5", "sunflower", "winter_angle", "red_mirror", "couple_moon", "felices", "kamen", "selfie_1", "cartoon_portrait_red", "rose2", "glacier", "cartoon_portrait_brown", "trungthu2", "halloween", "cartoon_portrait_blonde", "angelitos", "futurecat", "portrait_2", "desert", "neonpotrait", "ghostface", "beach", "trungthu3", "couple_portrait_2", "couple_portrait_3", "flower", "wedding", "bedroom", "winter", "trungthu1", "portrait_7", "diwali2", "ocean", "red_rose", "witch", "gothics", "firetwin", "greypotrait", "new_year", "couple_romantic_bw", "portrait_graystudio", "steps_luxury_monochrome", "portrait_monoody", "portrait_equestrian_mono", "couple_monochrome_intimate", "bw_3", "horse_editorial_monochrome", "bw_7", "fashion_monochrome_columns3", "equestrian_moody_bw", "gothic_stairs_bw", "editorial_horse_mono", "bw_4", "editorial_equestrian_mono", "fashion_monochrome_columns2", "fashion_gothic_bw", "bw_5", "fashion_gothic_columns", "editorial_equestrian_mono2", "couple_monochrome_editorial", "bwsoft_portrait", "editorial_horse_mono2", "bw_1", "bw_family_1", "bw_2", "bw_family_2", "fashion_monochrome_columns", "bw_family_3", "bw_family_4", "bw_6", "gym_1", "gym_2", "gym_3", "black_1", "pinkman", "black_2", "black_3", "holi_women_1", "holi_women_2", "holi_men_3", "holi_women_3", "holi_couple_1", "holi_women_4", "red_hero_1", "holi_men_1", "holi_men_2", "holi_women_5", "holi_women_6", "holi_women_7", "holi_women_8", "holi_women_9", "holi_women_10", "holi_women_11", "holi_women_12", "holi_women_13", "holi_women_14", "luna_new_year_1", "luna_new_year_2", "luna_new_year_3", "luna_new_year_4", "luna_new_year_5", "luna_new_year_6", "luna_new_year_7", "luna_new_year_8", "proposal", "woman_bed", "woman_ballon", "couple_flower", "rooftop_romance", "christmas_7", "pet_claus", "family_xmas", "xmas_lovers", "santa_moment", "qin_shi_huang", "banzai", "zack_the_zipper", "shimo_hayha", "brunhilde", "hades", "budda", "royal_general", "si_yao_yao", "maha_kuasa", "herman_williem", "xmas_friend"]), ...this.gen("content_sola_", ["kiss_1", "grass_1", "baby_chibi_1", "hpbd_1", "colorful_2", "bw_father_2", "sticker_1", "mini_me", "retro_6", "sticker_2", "butterfly_3", "childhood", "couple_art_1", "south", "butterfly_4", "butterfly_5", "butterfly_6", "butterfly_7", "flash_1", "purple_retro_1", "pink_retro", "radha_1", "beach_butterfly_1", "motion_poster", "doodle_1", "zodiac", "ig", "sticker_3"]), ...this.gen("content_nnao_", ["wc_portugal_1"])];
  }
  gen(prefix, names) {
    return names.map(name => `${prefix}${name}`);
  }
  auth() {
    const now = Math.floor(Date.now() / 1e3);
    const exp = now + 60;
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.key, "utf8"), Buffer.from(this.iv, "utf8"));
    return Buffer.concat([cipher.update(`${now}||${this.pkg}||${exp}`, "utf8"), cipher.final()]).toString("base64");
  }
  hdrs(extra = {}) {
    return {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "x-client-auth": this.auth(),
      "device-id": this.devId,
      "app-user-id": "",
      "app-version": "1.7.4",
      "version-code": "74",
      "language-code": "en",
      "app-id": this.pkg,
      "os-type": "android",
      ...extra
    };
  }
  async toBuf(src) {
    try {
      if (src instanceof Buffer) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          console.log("[Proses] Fetching remote image...");
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(src.includes("base64,") ? src.split("base64,")[1] : src, "base64");
      }
      return null;
    } catch (err) {
      console.log(`[Error] Resolve buffer gagal: ${err.message}`);
      return null;
    }
  }
  async upImg(src) {
    try {
      const buf = await this.toBuf(src);
      if (!buf) return null;
      const form = new FormData();
      form.append("file", buf, {
        filename: "temp_image.jpg",
        contentType: "image/jpeg"
      });
      const res = await axios.post(`${this.base}/upload/image-v3`, form, {
        headers: this.hdrs(form.getHeaders())
      });
      return res.data?.data?.imageUrl || null;
    } catch (err) {
      console.log(`[Error] Upload gagal: ${err.message}`);
      return null;
    }
  }
  async generate(options = {}) {
    try {
      let {
        mode,
        prompt = "",
        image = null,
        ratio = "1:1",
        stylemid = "",
        ...rest
      } = options;
      if (mode && !this.vModes.includes(mode.toLowerCase())) {
        console.log(`[Error] Mode "${mode}" tidak terdaftar.`);
        return {
          success: false,
          error: `Mode salah! Hanya boleh: ${this.vModes.join(" atau ")}`,
          availableModes: this.vModes
        };
      }
      if (!mode) {
        mode = "image";
        console.log(`[Auto-Detect] Mode kosong, diatur ke default: ${mode.toUpperCase()}`);
      }
      const images = Array.isArray(image) ? image : image ? [image] : [];
      if (!stylemid && (!prompt || !prompt.trim())) {
        console.log("[Error] Validasi gagal: prompt diperlukan jika stylemid tidak disediakan.");
        return {
          success: false,
          error: 'Missing required parameters: "prompt" is required when "stylemid" is absent.'
        };
      }
      if (stylemid && !this.vStyles.includes(stylemid)) {
        console.log(`[Error] Style "${stylemid}" tidak ditemukan.`);
        return {
          success: false,
          error: `Stylemid "${stylemid}" tidak valid atau salah ketik!`,
          availableStyles: this.vStyles
        };
      }
      let urls = [];
      let tId = "";
      const isVid = mode.toLowerCase() === "video";
      console.log(`[Proses] Membuat antrean [Mode: ${mode.toUpperCase()}]...`);
      switch (mode.toLowerCase()) {
        case "video": {
          const form = new FormData();
          if (images.length > 0) {
            let idx = 0;
            for (const img of images) {
              const buf = await this.toBuf(img);
              if (buf) form.append("file", buf, {
                filename: `temp_${idx++}.jpg`,
                contentType: "image/jpeg"
              });
            }
          }
          form.append("prompt", prompt || "A cinematic motion output");
          form.append("aspectRatio", ratio === "1:1" ? "9:16" : ratio);
          form.append("image_prompt", "");
          form.append("model_type", rest.model_type || "");
          form.append("is_regenerate", "false");
          const res = await axios.post(`${this.cdn}/video/createTask`, form, {
            headers: this.hdrs({
              fcm_token: this.fcm,
              ...form.getHeaders()
            })
          });
          tId = res.data?.data?.taskId;
          break;
        }
        case "image":
        default: {
          if (images.length > 0) {
            for (const img of images) {
              const cdnUrl = await this.upImg(img);
              if (cdnUrl) {
                urls.push(cdnUrl);
                console.log(`[Proses] Terunggah: ${cdnUrl}`);
              }
            }
          }
          const data = {
            materialId: stylemid || prompt || "content_nano_bufterfly_1",
            ratio: ratio,
            ...urls.length > 0 && {
              url: urls[0],
              urls: urls
            },
            ...rest
          };
          const res = await axios.post(`${this.base}/image/createTask`, data, {
            headers: this.hdrs({
              "Content-Type": "application/json",
              fcm_token: this.fcm
            })
          });
          tId = res.data?.data?.taskId;
          break;
        }
      }
      if (!tId) {
        return {
          success: false,
          error: "Gagal memperoleh ID Task dari endpoint server"
        };
      }
      console.log(`[Sukses] Task didaftarkan: ${tId}`);
      return await this.poll(tId, isVid);
    } catch (err) {
      console.log(`[Error] Eksekusi gagal: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async poll(taskId, isVid = false) {
    const url = isVid ? `${this.cdn}/video/checkTask` : `${this.base}/image/checkTask`;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await axios.post(url, {
          accessKey: "",
          is_regenerate: false,
          model_type: isVid ? "" : "v_fuse",
          secretKey: "",
          taskId: taskId
        }, {
          headers: this.hdrs({
            "Content-Type": "application/json"
          })
        });
        const data = res.data?.data || {};
        const state = data.state || "processing";
        console.log(`[Polling #${i + 1}] Status task: ${state}`);
        if (state === "success" && data.resultJson) {
          return {
            success: true,
            taskId: taskId,
            urls: JSON.parse(data.resultJson)?.resultUrls || []
          };
        }
        if (state === "failed") {
          return {
            success: false,
            taskId: taskId,
            error: "Pemrosesan task digagalkan server"
          };
        }
      } catch (err) {
        console.log(`[Warning] Gagal mengambil status: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    return {
      success: false,
      taskId: taskId,
      error: "Timeout polling antrean berakhir"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new NanoBananaAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}