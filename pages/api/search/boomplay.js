import axios from "axios";
import qs from "qs";
import crypto from "crypto";
class BoomplayClient {
  constructor() {
    this.clientVersion = "7.8.13";
    this.versionCode = "7813";
    this.salt = "6b16a5eadb411513";
    this.hosts = {
      api: ["api.boomplaymusic.com", "api1.boomplaymusic.com", "api2.boomplaymusic.com", "api3.boomplaymusic.com"],
      source: ["source.boomplaymusic.com", "source1.boomplaymusic.com", "source2.boomplaymusic.com", "source3.boomplaymusic.com"],
      sign_source: ["music-301.boomplaymusic.com", "music-302.boomplaymusic.com"]
    };
    this.selectedApiBase = null;
    this.selectedSourceBase = null;
    this.selectedSignSourceBase = null;
    this.aesKey = Buffer.from("boomplayUNmn3IbI", "utf-8");
    this.aesIv = Buffer.from("boomplayuvEJOzIK", "utf-8");
    this.defaultState = this._genState();
  }
  async _checkHost(host, pingCount = 2) {
    try {
      let failures = 0;
      let totalLatency = 0;
      for (let i = 0; i < pingCount; i++) {
        const start = Date.now();
        try {
          await axios.get(`https://${host}/check.do`, {
            timeout: 2e3,
            headers: {
              Connection: "close"
            }
          });
          totalLatency += Date.now() - start;
        } catch {
          failures++;
        }
      }
      const lossRate = failures / pingCount * 100;
      const successCount = pingCount - failures;
      const avgLatency = successCount > 0 ? totalLatency / successCount : Infinity;
      return {
        host: host,
        lossRate: lossRate,
        avgLatency: avgLatency
      };
    } catch (err) {
      console.error(`[_checkHost Error ${host}]:`, err?.message);
      return {
        host: host,
        lossRate: 100,
        avgLatency: Infinity
      };
    }
  }
  async _getBestBaseUrl(hostList = this.hosts.api, pingCount = 2) {
    try {
      console.log("[+] Memulai Health Check Host Selector...");
      const results = await Promise.all(hostList.map(host => this._checkHost(host, pingCount)));
      results.sort((a, b) => {
        if (a.lossRate !== b.lossRate) {
          return a.lossRate - b.lossRate;
        }
        return a.avgLatency - b.avgLatency;
      });
      console.log("[+] Hasil Sort Host:", results);
      const best = results[0];
      return best && best.lossRate < 100 ? `https://${best.host}` : `https://${hostList[0]}`;
    } catch (err) {
      console.error("[_getBestBaseUrl Error]:", err?.message);
      return `https://${hostList[0]}`;
    }
  }
  async _getApiBase() {
    try {
      if (!this.selectedApiBase) {
        const bestHost = await this._getBestBaseUrl(this.hosts.api);
        this.selectedApiBase = `${bestHost}/BoomPlayer`;
        console.log(`[API BASE SELECTED] ${this.selectedApiBase}`);
      }
      return this.selectedApiBase;
    } catch (err) {
      console.error("[_getApiBase Error]:", err?.message);
      return `https://${this.hosts.api[0]}/BoomPlayer`;
    }
  }
  async _getSourceBase() {
    try {
      if (!this.selectedSourceBase) {
        const bestHost = await this._getBestBaseUrl(this.hosts.source);
        this.selectedSourceBase = bestHost;
        console.log(`[SOURCE BASE SELECTED] ${this.selectedSourceBase}`);
      }
      return this.selectedSourceBase;
    } catch (err) {
      console.error("[_getSourceBase Error]:", err?.message);
      return `https://${this.hosts.source[0]}`;
    }
  }
  async _getSignSourceBase() {
    try {
      if (!this.selectedSignSourceBase) {
        const bestHost = await this._getBestBaseUrl(this.hosts.sign_source);
        this.selectedSignSourceBase = bestHost;
        console.log(`[SIGN SOURCE BASE SELECTED] ${this.selectedSignSourceBase}`);
      }
      return this.selectedSignSourceBase;
    } catch (err) {
      console.error("[_getSignSourceBase Error]:", err?.message);
      return `https://${this.hosts.sign_source[0]}`;
    }
  }
  _md516(str) {
    try {
      const full = crypto.createHash("md5").update(String(str || "")).digest("hex");
      return full.substring(8, 24);
    } catch (err) {
      console.error("[_md516 Error]:", err?.message);
      return "";
    }
  }
  _genReferer(imei) {
    try {
      const cleanImei = imei || "1_2a63e32abae6d817";
      const imeiHash = this._md516(cleanImei);
      const raw = `AndroidV5.5${imeiHash}${this.salt}`;
      return this._md516(raw);
    } catch (err) {
      console.error("[_genReferer Error]:", err?.message);
      return "6c4406d01fae3f98";
    }
  }
  _toSnake(str) {
    try {
      return str ? str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase() : "";
    } catch (err) {
      console.error("[_toSnake Error]:", err?.message);
      return str || "";
    }
  }
  _decryptResource(encryptedBase64, customBaseUrl = null) {
    try {
      if (!encryptedBase64 || typeof encryptedBase64 !== "string") return encryptedBase64;
      if (encryptedBase64.startsWith("http://") || encryptedBase64.startsWith("https://")) {
        return encryptedBase64;
      }
      const base = customBaseUrl ? customBaseUrl : this.selectedSignSourceBase || `https://${this.hosts.sign_source[0]}`;
      const cipherBuffer = Buffer.from(encryptedBase64, "base64");
      const decipher = crypto.createDecipheriv("aes-128-cbc", this.aesKey, this.aesIv);
      decipher.setAutoPadding(true);
      let path = decipher.update(cipherBuffer, null, "utf8");
      path += decipher.final("utf8");
      return `${base}${path}`;
    } catch (err) {
      console.error("[_decryptResource Error]:", err?.message);
      return encryptedBase64;
    }
  }
  _formatMediaUrl(val) {
    try {
      if (!val || typeof val !== "string") return val;
      if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
        return val;
      }
      const isImage = /\.(webp|jpg|jpeg|png|gif|svg|bmp)(\?.*)?$/i.test(val);
      const isGroupPath = val.startsWith("group") || val.startsWith("/group");
      if (isImage || isGroupPath) {
        const base = this.selectedSourceBase || `https://${this.hosts.source[0]}`;
        const cleanPath = val.startsWith("/") ? val.slice(1) : val;
        return `${base}/${cleanPath}`;
      }
      return val;
    } catch (err) {
      console.error("[_formatMediaUrl Error]:", err?.message);
      return val;
    }
  }
  _formatRes(data) {
    try {
      let parsed = data;
      if (typeof data === "string") {
        const trimmed = data.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            return this._formatMediaUrl(data);
          }
        } else {
          return this._formatMediaUrl(data);
        }
      }
      if (Array.isArray(parsed)) {
        return parsed.map(item => this._formatRes(item));
      }
      if (parsed !== null && typeof parsed === "object") {
        return Object.fromEntries(Object.entries(parsed).map(([key, val]) => {
          const snakeKey = this._toSnake(key);
          if ((key === "downloadResource" || snakeKey === "download_resource") && typeof val === "string") {
            const decryptedUrl = this._decryptResource(val);
            return [snakeKey, decryptedUrl];
          }
          return [snakeKey, this._formatRes(val)];
        }));
      }
      return parsed;
    } catch (err) {
      console.error("[_formatRes Error]:", err?.message);
      return data;
    }
  }
  _genState(custom = {}) {
    try {
      const hexImei = crypto.randomBytes(8).toString("hex");
      const hexImsi = crypto.randomBytes(8).toString("hex");
      const hexDev = crypto.randomBytes(8).toString("hex");
      const stateObj = {
        curClientVersionCode: this.versionCode,
        bppl: "3",
        gaid: crypto.randomUUID(),
        lan: "id_ID",
        channel: "and_google",
        imei: `1_${hexImei}`,
        imsi: `2_${hexImsi}`,
        systemVersionCode: "35",
        ua: "realmeRMX3890",
        mcc: "510",
        deviceID: hexDev,
        ...custom
      };
      if (!stateObj.sessionID) {
        delete stateObj.sessionID;
      }
      return this._encState(stateObj);
    } catch (err) {
      console.error("[_genState Error]:", err?.message);
      return "";
    }
  }
  _encState(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      console.error("[_encState Error]:", err?.message);
      return "";
    }
  }
  _decState(b64) {
    try {
      return JSON.parse(Buffer.from(b64 || this.defaultState, "base64").toString("utf-8"));
    } catch (err) {
      console.error("[_decState Error]:", err?.message);
      return {};
    }
  }
  _genTraceId() {
    try {
      return crypto.randomBytes(16).toString("hex") + Date.now();
    } catch (err) {
      console.error("[_genTraceId Error]:", err?.message);
      return `${Date.now()}`;
    }
  }
  _getHeaders(stateB64, customHeaders = {}) {
    try {
      const comp = stateB64 ? stateB64 : this.defaultState;
      const stateObj = this._decState(comp);
      const referer = this._genReferer(stateObj?.imei);
      return {
        "User-Agent": `BoomPlay/${this.clientVersion}`,
        "Accept-Encoding": "gzip",
        Connection: "close",
        "bp-traceid": this._genTraceId(),
        "bp-phase": "1",
        "bp-isfinal": "0",
        "bp-referer": referer,
        "bp-comp": comp,
        ...customHeaders
      };
    } catch (err) {
      console.error("[_getHeaders Error]:", err?.message);
      return customHeaders || {};
    }
  }
  async _req({
    method = "GET",
    path = "",
    params = {},
    data = null,
    headers = {},
    state = null
  }) {
    const activeState = state ? state : this.defaultState;
    console.log(`[REQ] ${method.toUpperCase()} -> ${path}`);
    try {
      const [baseUrl] = await Promise.all([this._getApiBase(), this._getSourceBase(), this._getSignSourceBase()]);
      const res = await axios({
        method: method || "GET",
        url: `${baseUrl}${path}`,
        params: params || {},
        data: data || undefined,
        headers: this._getHeaders(activeState, headers)
      });
      console.log(`[REQ SUCCESS] ${path} (Status: ${res?.status})`);
      return {
        status: true,
        state: activeState,
        result: this._formatRes(res?.data)
      };
    } catch (err) {
      console.error(`[REQ ERROR] ${path}:`, err?.response?.data || err?.message);
      return {
        status: false,
        state: activeState,
        error: this._formatRes(err?.response?.data || err?.message)
      };
    }
  }
  async download({
    url,
    state,
    autoSelectHost = true,
    ...rest
  } = {}) {
    console.log("[CALL] download...");
    try {
      if (!url) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'url' wajib diisi."
        };
      }
      let finalUrl = url;
      if (autoSelectHost) {
        const bestSignBase = await this._getSignSourceBase();
        if (bestSignBase) {
          if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = this._decryptResource(finalUrl, bestSignBase);
          } else {
            try {
              const parsed = new URL(finalUrl);
              const bestParsed = new URL(bestSignBase);
              parsed.host = bestParsed.host;
              finalUrl = parsed.toString();
            } catch {}
          }
        }
      }
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = this._decryptResource(finalUrl);
      }
      console.log(`[DOWNLOADING FROM] ${finalUrl}`);
      const res = await axios({
        method: "GET",
        url: finalUrl,
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "okhttp/4.10.0",
          range: "bytes=0-",
          "x-boomplay-ref": "Boomplay_WEBV1",
          ...rest
        }
      });
      console.log(`[DOWNLOAD SUCCESS] Status: ${res?.status}`);
      return {
        status: true,
        state: state || this.defaultState,
        url: finalUrl,
        content_type: res?.headers?.["content-type"] || "audio/mp4",
        content_length: res?.headers?.["content-length"] || res?.data?.length,
        buffer: Buffer.from(res?.data)
      };
    } catch (err) {
      console.error("[FAILED] download:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getItems({
    state,
    page = 0,
    size = 15,
    ...rest
  } = {}) {
    console.log("[CALL] getItems...");
    try {
      return await this._req({
        method: "GET",
        path: "/recommend/userBootstraping/getItems",
        params: {
          pageIndex: page ? page : 0,
          pageSize: size ? size : 15,
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getItems:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async genPlaylist({
    state,
    itemList,
    ...rest
  } = {}) {
    console.log("[CALL] genPlaylist...");
    try {
      if (!itemList) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'itemList' wajib diisi."
        };
      }
      const postData = qs.stringify({
        itemList: typeof itemList === "string" ? itemList : JSON.stringify(itemList),
        ...rest
      });
      return await this._req({
        method: "POST",
        path: "/recommend/userBootstraping/generatePlaylist",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        data: postData,
        state: state
      });
    } catch (err) {
      console.error("[FAILED] genPlaylist:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getMusics({
    state,
    colID,
    page = 0,
    size = 30,
    trackPoint = "",
    colGrpID = "",
    ...rest
  } = {}) {
    console.log("[CALL] getMusics...");
    try {
      if (!colID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'colID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getMusics",
        params: {
          pageIndex: page ? page : 0,
          pageSize: size ? size : 30,
          colID: colID || "",
          cacheColVersionCode: 0,
          cacheCountryCode: "",
          trackPoint: trackPoint || "",
          colGrpID: colGrpID || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getMusics:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getMusicHome({
    state,
    colPageSize = 6,
    dataVersion = 0,
    isDragDown = false,
    ...rest
  } = {}) {
    console.log("[CALL] getMusicHome...");
    try {
      return await this._req({
        method: "GET",
        path: "/item/getMusicHome",
        params: {
          isDragDown: isDragDown ? isDragDown : false,
          colPageSize: colPageSize ? colPageSize : 6,
          dataVersion: dataVersion ? dataVersion : 0,
          cacheCountryCode: "ID",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getMusicHome:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getRecCols({
    state,
    colID,
    page = 0,
    size = 20,
    itemType = "COL",
    ...rest
  } = {}) {
    console.log("[CALL] getRecCols...");
    try {
      if (!colID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'colID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getRecommendCols",
        params: {
          pageSize: size ? size : 20,
          pageIndex: page ? page : 0,
          itemType: itemType || "COL",
          colID: colID || "",
          firstAlpha: "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getRecCols:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getSlides({
    state,
    ...rest
  } = {}) {
    console.log("[CALL] getSlides...");
    try {
      return await this._req({
        method: "GET",
        path: "/slide/getSlides",
        params: {
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getSlides:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getTrendHome({
    state,
    ...rest
  } = {}) {
    console.log("[CALL] getTrendHome...");
    try {
      return await this._req({
        method: "POST",
        path: "/trending/getHome",
        params: {
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getTrendHome:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getLyric({
    state,
    musicID,
    name = "",
    ...rest
  } = {}) {
    console.log("[CALL] getLyric...");
    try {
      if (!musicID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'musicID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getLyricID",
        params: {
          musicID: musicID || "",
          name: name || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getLyric:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getPositionList({
    state,
    ...rest
  } = {}) {
    console.log("[CALL] getPositionList...");
    try {
      return await this._req({
        method: "GET",
        path: "/confInfo/v1/getPlayHomePositionInfoList",
        params: {
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getPositionList:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getDetail({
    state,
    musicID,
    ...rest
  } = {}) {
    console.log("[CALL] getDetail...");
    try {
      if (!musicID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'musicID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/content/music/detail",
        params: {
          musicID: musicID || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getDetail:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async syncMusic({
    state,
    musicIDs,
    ...rest
  } = {}) {
    console.log("[CALL] syncMusic...");
    try {
      if (!musicIDs) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'musicIDs' wajib diisi."
        };
      }
      const encodedIDs = typeof musicIDs === "string" ? musicIDs.startsWith("[") ? Buffer.from(musicIDs).toString("base64") : musicIDs : Buffer.from(JSON.stringify(musicIDs)).toString("base64");
      return await this._req({
        method: "GET",
        path: "/music/syncMusicInfo",
        params: {
          musicIDs: encodedIDs,
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] syncMusic:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async downSuccess({
    state,
    downloadID,
    itemID,
    check = "",
    quality = "md",
    itemType = "MUSIC",
    subGrade = 0,
    ...rest
  } = {}) {
    console.log("[CALL] downSuccess...");
    try {
      if (!downloadID || !itemID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'downloadID' dan 'itemID' wajib diisi."
        };
      }
      return await this._req({
        method: "POST",
        path: "/item/downloadSuccessItem",
        params: {
          subGrade: subGrade ? subGrade : 0,
          downloadID: downloadID || "",
          check: check || "",
          quality: quality || "md",
          itemID: itemID || "",
          itemType: itemType || "MUSIC",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] downSuccess:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async preDownload({
    state,
    itemID,
    downloadID = null,
    check = "",
    quality = "md",
    trackPoint = "",
    isTry = "F",
    ...rest
  } = {}) {
    console.log("[CALL] preDownload...");
    try {
      if (!itemID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'itemID' wajib diisi."
        };
      }
      const activeDownloadId = downloadID ? downloadID : crypto.randomUUID();
      return await this._req({
        method: "GET",
        path: "/content/download/item/preDownload",
        params: {
          itemID: itemID || "",
          itemType: "MUSIC",
          trackPoint: trackPoint || "",
          downloadID: activeDownloadId,
          subType: 0,
          check: check || "",
          isTry: isTry || "F",
          quality: quality || "md",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] preDownload:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getArtist({
    state,
    musicID,
    ...rest
  } = {}) {
    console.log("[CALL] getArtist...");
    try {
      if (!musicID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'musicID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/content/music/getArtistInfo",
        params: {
          musicID: musicID || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getArtist:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getComments({
    state,
    targetID,
    page = 0,
    size = 20,
    targetType = "MUSIC",
    ...rest
  } = {}) {
    console.log("[CALL] getComments...");
    try {
      if (!targetID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'targetID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getTargetComments",
        params: {
          pageIndex: page ? page : 0,
          pageSize: size ? size : 20,
          targetID: targetID || "",
          targetType: targetType || "MUSIC",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getComments:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async search({
    state,
    content,
    itemType = "MUSIC",
    searchType = "",
    page = 0,
    size = 20,
    searchSessionID = null,
    searchRequestSource = "Search_E",
    ...rest
  } = {}) {
    console.log("[CALL] search...");
    try {
      if (!content) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'content' wajib diisi."
        };
      }
      return await this._req({
        method: "POST",
        path: "/search/searchItems",
        params: {
          pageIndex: page ? page : 0,
          pageSize: size ? size : 20,
          content: content || "",
          itemType: itemType !== undefined ? itemType : "MUSIC",
          searchType: searchType || "",
          isPlaylistSearch: "F",
          isSuggest: true,
          searchRequestSource: searchRequestSource || "Search_E",
          searchSessionID: searchSessionID ? searchSessionID : crypto.randomUUID(),
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] search:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async searchAssociate({
    state,
    content,
    ...rest
  } = {}) {
    console.log("[CALL] searchAssociate...");
    try {
      if (!content) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'content' wajib diisi."
        };
      }
      return await this._req({
        method: "POST",
        path: "/item/searchAssociate",
        params: {
          content: content || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] searchAssociate:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getMoreExplore({
    state,
    page = 0,
    size = 20,
    ...rest
  } = {}) {
    console.log("[CALL] getMoreExplore...");
    try {
      return await this._req({
        method: "GET",
        path: "/search/moreToExplore/list",
        params: {
          pageIndex: page ? page : 0,
          pageSize: size ? size : 20,
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getMoreExplore:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getClipFlows({
    state,
    ...rest
  } = {}) {
    console.log("[CALL] getClipFlows...");
    try {
      return await this._req({
        method: "POST",
        path: "/explore/clip/highlight-flows",
        params: {
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getClipFlows:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getClipMusics({
    state,
    startFromCurrent = 1,
    dataSource = 0,
    ...rest
  } = {}) {
    console.log("[CALL] getClipMusics...");
    try {
      return await this._req({
        method: "GET",
        path: "/explore/clip/label/v2/musics",
        params: {
          startFromCurrent: startFromCurrent !== undefined ? startFromCurrent : 1,
          dataSource: dataSource !== undefined ? dataSource : 0,
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getClipMusics:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getArtistHome1({
    state,
    colID,
    trackPoint = "",
    ...rest
  } = {}) {
    console.log("[CALL] getArtistHome1...");
    try {
      if (!colID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'colID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/content/artist-home/v1/getHomepage1",
        params: {
          colID: colID || "",
          trackPoint: trackPoint || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getArtistHome1:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getArtistHome2({
    state,
    colID,
    ...rest
  } = {}) {
    console.log("[CALL] getArtistHome2...");
    try {
      if (!colID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'colID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/content/artist-home/v1/getHomepage2",
        params: {
          colID: colID || "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getArtistHome2:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getArtistOpPlaylists({
    state,
    colID,
    page = 0,
    size = 20,
    ...rest
  } = {}) {
    console.log("[CALL] getArtistOpPlaylists...");
    try {
      if (!colID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'colID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/content/artist-home/v1/getMoreOpPlaylists",
        params: {
          colID: colID || "",
          pageIndex: page ? page : 0,
          pageSize: size ? size : 20,
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getArtistOpPlaylists:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getVideo({
    state,
    videoID,
    ...rest
  } = {}) {
    console.log("[CALL] getVideo...");
    try {
      if (!videoID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'videoID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getVideo",
        params: {
          videoID: videoID || "",
          cacheVideoVersionCode: 0,
          cacheCountryCode: "",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getVideo:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
  async getRecommendVideos({
    state,
    videoID,
    type = "MUSIC_VIDEO",
    ...rest
  } = {}) {
    console.log("[CALL] getRecommendVideos...");
    try {
      if (!videoID) {
        return {
          status: false,
          state: state || this.defaultState,
          error: "Parameter 'videoID' wajib diisi."
        };
      }
      return await this._req({
        method: "GET",
        path: "/item/getRecommendVideos",
        params: {
          videoID: videoID || "",
          type: type || "MUSIC_VIDEO",
          ...rest
        },
        state: state
      });
    } catch (err) {
      console.error("[FAILED] getRecommendVideos:", err?.message);
      return {
        status: false,
        state: state || this.defaultState,
        error: err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["download", "items", "gen_playlist", "musics", "music_home", "rec_cols", "slides", "trend_home", "lyric", "position_list", "detail", "sync_music", "down_success", "pre_download", "artist", "comments", "search", "search_associate", "more_explore", "clip_flows", "clip_musics", "artist_home1", "artist_home2", "artist_op_playlists", "video", "recommend_videos"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          download: "/?action=download&url=ehJFdlmhwBbyvud1JG3V5hsZVfkOUJYysR0PZF8D...",
          pre_download: "/?action=pre_download&itemID=263959054",
          search: "/?action=search&content=Alan+Walker&itemType=MUSIC",
          search_user: "/?action=search&content=adelle&itemType=USER&searchType=USER",
          video: "/?action=video&videoID=1297225",
          recommend_videos: "/?action=recommend_videos&videoID=1297225&type=MUSIC_VIDEO",
          artist_home1: "/?action=artist_home1&colID=3260222"
        }
      }
    });
  }
  const api = new BoomplayClient();
  try {
    if (action === "download") {
      if (!params.url) {
        return res.status(400).json({
          status: false,
          error: "Parameter 'url' wajib diisi untuk action 'download'."
        });
      }
      const response = await api.download(params);
      if (response?.status === false) {
        return res.status(500).json({
          status: false,
          action: action,
          error: response.error || "Gagal mengunduh file media.",
          state: response.state || null
        });
      }
      res.setHeader("Content-Type", response?.content_type || "audio/mp4");
      if (response?.content_length) {
        res.setHeader("Content-Length", response?.content_length);
      }
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Disposition", "inline");
      return res.status(200).send(response.buffer);
    }
    let response;
    switch (action) {
      case "items":
        response = await api.getItems(params);
        break;
      case "gen_playlist":
        if (!params.itemList) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'itemList' wajib diisi untuk action 'gen_playlist'."
          });
        }
        response = await api.genPlaylist(params);
        break;
      case "musics":
        if (!params.colID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'colID' wajib diisi untuk action 'musics'."
          });
        }
        response = await api.getMusics(params);
        break;
      case "music_home":
        response = await api.getMusicHome(params);
        break;
      case "rec_cols":
        if (!params.colID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'colID' wajib diisi untuk action 'rec_cols'."
          });
        }
        response = await api.getRecCols(params);
        break;
      case "slides":
        response = await api.getSlides(params);
        break;
      case "trend_home":
        response = await api.getTrendHome(params);
        break;
      case "lyric":
        if (!params.musicID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'musicID' wajib diisi untuk action 'lyric'."
          });
        }
        response = await api.getLyric(params);
        break;
      case "position_list":
        response = await api.getPositionList(params);
        break;
      case "detail":
        if (!params.musicID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'musicID' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.getDetail(params);
        break;
      case "sync_music":
        if (!params.musicIDs) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'musicIDs' wajib diisi untuk action 'sync_music'."
          });
        }
        response = await api.syncMusic(params);
        break;
      case "down_success":
        if (!params.downloadID || !params.itemID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'downloadID' dan 'itemID' wajib diisi untuk action 'down_success'."
          });
        }
        response = await api.downSuccess(params);
        break;
      case "pre_download":
        if (!params.itemID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'itemID' wajib diisi untuk action 'pre_download'."
          });
        }
        response = await api.preDownload(params);
        break;
      case "artist":
        if (!params.musicID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'musicID' wajib diisi untuk action 'artist'."
          });
        }
        response = await api.getArtist(params);
        break;
      case "comments":
        if (!params.targetID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'targetID' wajib diisi untuk action 'comments'."
          });
        }
        response = await api.getComments(params);
        break;
      case "search":
        if (!params.content) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'content' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "search_associate":
        if (!params.content) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'content' wajib diisi untuk action 'search_associate'."
          });
        }
        response = await api.searchAssociate(params);
        break;
      case "more_explore":
        response = await api.getMoreExplore(params);
        break;
      case "clip_flows":
        response = await api.getClipFlows(params);
        break;
      case "clip_musics":
        response = await api.getClipMusics(params);
        break;
      case "artist_home1":
        if (!params.colID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'colID' wajib diisi untuk action 'artist_home1'."
          });
        }
        response = await api.getArtistHome1(params);
        break;
      case "artist_home2":
        if (!params.colID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'colID' wajib diisi untuk action 'artist_home2'."
          });
        }
        response = await api.getArtistHome2(params);
        break;
      case "artist_op_playlists":
        if (!params.colID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'colID' wajib diisi untuk action 'artist_op_playlists'."
          });
        }
        response = await api.getArtistOpPlaylists(params);
        break;
      case "video":
        if (!params.videoID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'videoID' wajib diisi untuk action 'video'."
          });
        }
        response = await api.getVideo(params);
        break;
      case "recommend_videos":
        if (!params.videoID) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'videoID' wajib diisi untuk action 'recommend_videos'."
          });
        }
        response = await api.getRecommendVideos(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === false) {
      return res.status(500).json({
        status: false,
        action: action,
        error: response.error || response.result?.error || "Gagal memproses request internal API.",
        state: response.state || null
      });
    }
    const payload = Array.isArray(response) ? {
      data: response
    } : typeof response === "object" && response !== null ? response : {
      data: response
    };
    return res.status(200).json({
      status: true,
      action: action,
      ...payload
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}