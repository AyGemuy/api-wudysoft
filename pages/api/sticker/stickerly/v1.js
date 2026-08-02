import axios from "axios";
import crypto from "crypto";
class StickerLy {
  constructor() {
    try {
      this.base = "https://api.sticker.ly/v4";
      this.duid = crypto.randomBytes(8).toString("hex");
      this.headers = {
        "User-Agent": "androidapp.stickerly/3.35.0 (RMX3890; U; Android 35; id-ID; id;)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-duid": this.duid
      };
      this.client = axios.create({
        baseURL: this.base,
        headers: this.headers,
        timeout: 6e4
      });
      this.endpoint = {
        ai_play: {
          method: "GET",
          path: "/ai-play/templates",
          req: [],
          def: {}
        },
        user_oid: {
          method: "GET",
          path: "/user/oid/:oid",
          req: ["oid"],
          def: {
            socialLink: false,
            simple: true
          }
        },
        sticker_rel: {
          method: "GET",
          path: "/sticker/related",
          req: ["sid"],
          def: {}
        },
        feeds: {
          method: "POST",
          path: "/user/feeds",
          req: [],
          def: {}
        },
        pack_smart: {
          method: "POST",
          path: "/stickerPack/smartSearch",
          req: ["keyword"],
          def: {
            enabledKeywordSearch: true,
            filter: {
              extendSearchResult: true,
              sortBy: "RECOMMENDED",
              languages: ["ALL"],
              minStickerCount: 5,
              searchBy: "ALL",
              stickerType: "ALL"
            }
          }
        },
        banner: {
          method: "GET",
          path: "/banner/overview",
          req: [],
          def: {}
        },
        pack_det: {
          method: "GET",
          path: "/stickerPack/:id",
          req: ["id"],
          def: {
            needRelation: false
          }
        },
        interact: {
          method: "POST",
          path: "/user/interactions",
          req: ["type", "packId", "timestamp"],
          def: {
            deviceId: this.duid
          }
        },
        pack_rel: {
          method: "GET",
          path: "/stickerPack/:id/recommendedCategories",
          req: ["id"],
          def: {
            group: 3
          }
        },
        stick_search: {
          method: "POST",
          path: "/sticker/searchV2",
          req: ["keyword"],
          def: {
            size: 400,
            enabledKeywordSearch: true
          }
        },
        tab_packs: {
          method: "GET",
          path: "/hometab/:id/packs",
          req: ["id"],
          def: {}
        },
        trending: {
          method: "POST",
          path: "/trending/search",
          req: [],
          def: {}
        },
        artist_rec: {
          method: "POST",
          path: "/artist/recommend",
          req: [],
          def: {}
        },
        user_rec: {
          method: "POST",
          path: "/user/recommend",
          req: [],
          def: {}
        },
        stick_rec: {
          method: "GET",
          path: "/sticker/recommend",
          req: [],
          def: {}
        },
        pack_pers: {
          method: "GET",
          path: "/stickerPack/personalized",
          req: [],
          def: {
            group: 3
          }
        },
        pack_view: {
          method: "POST",
          path: "/stickerPack/:id/view",
          req: ["id"],
          def: {}
        },
        usr_coll: {
          method: "POST",
          path: "/user/:id/userCollection/detailList",
          req: ["id"],
          def: {
            size: 30
          }
        },
        usr_packs: {
          method: "POST",
          path: "/user/:id/stickerPacks",
          req: ["id"],
          def: {
            isPrivate: false
          }
        },
        pack_search: {
          method: "POST",
          path: "/stickerPack/searchV2",
          req: ["keyword"],
          def: {
            size: 10,
            cursor: 1,
            limit: 20
          }
        },
        home: {
          method: "GET",
          path: "/hometab/overview",
          req: [],
          def: {}
        },
        tab_sticks: {
          method: "GET",
          path: "/hometab/:id/stickers",
          req: ["id"],
          def: {}
        },
        tag_search: {
          method: "POST",
          path: "/stickerTag/search",
          req: ["keyword"],
          def: {
            size: 10,
            cursor: 1,
            limit: 99
          }
        },
        tag_rec: {
          method: "GET",
          path: "/sticker/tag/recommend",
          req: [],
          def: {}
        }
      };
      console.log(`[INIT] StickerLy berhasil diinisialisasi dengan DUID: ${this.duid}`);
    } catch (e) {
      console.error(`[INIT_ERROR] Gagal menginisialisasi constructor: ${e.message}`);
    }
  }
  async execute(key, userParams = {}) {
    const config = this.endpoint?.[key];
    if (!config) {
      const msg = `Endpoint key '${key}' tidak terdaftar pada konfigurasi req_def.`;
      console.error(`[CONFIG ERROR] ${msg}`);
      return {
        error: true,
        msg: msg
      };
    }
    console.log(`[REQ] Memproses aksi: ${key}`);
    try {
      let customHeaders = {};
      if (userParams.headers) {
        customHeaders = userParams.headers;
        delete userParams.headers;
      }
      for (const reqParam of config.req) {
        if (userParams[reqParam] === undefined || userParams[reqParam] === null || userParams[reqParam] === "") {
          const msg = `Parameter '${reqParam}' wajib diisi untuk aksi '${key}'.`;
          console.error(`[VALIDATION_ERR] ${msg}`);
          return {
            error: true,
            msg: msg
          };
        }
      }
      const mergedParams = {
        ...config.def,
        ...userParams
      };
      let resolvedPath = config.path;
      const placeholders = resolvedPath.match(/:[a-zA-Z0-9]+/g) || [];
      for (const placeholder of placeholders) {
        const paramName = placeholder.slice(1);
        if (mergedParams[paramName] === undefined) {
          const msg = `Path parameter '${paramName}' tidak terdeteksi pada input data.`;
          console.error(`[PATH_ERR] ${msg}`);
          return {
            error: true,
            msg: msg
          };
        }
        resolvedPath = resolvedPath.replace(placeholder, encodeURIComponent(mergedParams[paramName]));
        delete mergedParams[paramName];
      }
      const isGet = config.method === "GET";
      const requestOptions = {
        method: config.method,
        url: resolvedPath,
        headers: {
          ...this.headers,
          ...customHeaders
        },
        params: isGet ? mergedParams : undefined,
        data: !isGet ? mergedParams : undefined
      };
      console.log(`[REQ_SEND] ${requestOptions.method} -> ${resolvedPath}`);
      const response = await this.client(requestOptions);
      const data = response.data;
      console.log(`[LOG_RESP] Status: ${data?.meta?.status || response.status || 200}`);
      return data?.result || data;
    } catch (error) {
      const responseData = error?.response?.data;
      const errorMessage = responseData?.meta?.message || responseData?.message || error.message;
      console.error(`[ERR_EXECUTE] Gagal memproses ${key}: ${errorMessage}`);
      return {
        error: true,
        msg: errorMessage,
        details: responseData || null
      };
    }
  }
  async ai_play() {
    return await this.execute("ai_play");
  }
  async user_oid(p) {
    return await this.execute("user_oid", p);
  }
  async sticker_rel(p) {
    return await this.execute("sticker_rel", p);
  }
  async feeds() {
    return await this.execute("feeds");
  }
  async pack_smart(p) {
    return await this.execute("pack_smart", p);
  }
  async banner() {
    return await this.execute("banner");
  }
  async pack_det(p) {
    return await this.execute("pack_det", p);
  }
  async interact(p) {
    return await this.execute("interact", p);
  }
  async pack_rel(p) {
    return await this.execute("pack_rel", p);
  }
  async stick_search(p) {
    return await this.execute("stick_search", p);
  }
  async tab_packs(p) {
    return await this.execute("tab_packs", p);
  }
  async trending(p) {
    return await this.execute("trending", p);
  }
  async artist_rec(p) {
    return await this.execute("artist_rec", p);
  }
  async user_rec() {
    return await this.execute("user_rec");
  }
  async stick_rec() {
    return await this.execute("stick_rec");
  }
  async pack_pers(p) {
    return await this.execute("pack_pers", p);
  }
  async pack_view(p) {
    return await this.execute("pack_view", p);
  }
  async usr_coll(p) {
    return await this.execute("usr_coll", p);
  }
  async usr_packs(p) {
    return await this.execute("usr_packs", p);
  }
  async pack_search(p) {
    return await this.execute("pack_search", p);
  }
  async home() {
    return await this.execute("home");
  }
  async tab_sticks(p) {
    return await this.execute("tab_sticks", p);
  }
  async tag_search(p) {
    return await this.execute("tag_search", p);
  }
  async tag_rec() {
    return await this.execute("tag_rec");
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const {
      action,
      ...restParams
    } = params;
    const api = new StickerLy();
    const validActions = Object.keys(api.req_def);
    if (!action) {
      console.warn("[HANDLER_WARN] Request masuk tanpa menyertakan parameter 'action'");
      return res.status(400).json({
        error: "Parameter 'action' wajib diisi.",
        actions: validActions
      });
    }
    const actionLower = action.toLowerCase();
    if (typeof api[actionLower] !== "function") {
      console.warn(`[HANDLER_WARN] Aksi '${actionLower}' tidak dikenali sebagai method internal`);
      return res.status(400).json({
        error: `Action tidak valid atau belum didukung: ${action}.`,
        valid_actions: validActions
      });
    }
    console.log(`[HANDLER_START] Menjalankan rute aksi: ${actionLower}`);
    const response = await api[actionLower](restParams);
    if (response?.error) {
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL_ERROR] Kegagalan kritis pada handler rute:`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}