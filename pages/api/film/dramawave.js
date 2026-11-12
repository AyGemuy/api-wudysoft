import axios from "axios";
import {
  randomUUID,
  createHash,
  randomBytes
} from "crypto";
const BASE_URL = "https://api.mydramawave.com/dm-api";
const SALT = "8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv";
const _rnd = {
  hex: size => randomBytes(size).toString("hex"),
  androidId: () => randomBytes(8).toString("hex"),
  firebaseId: () => randomBytes(16).toString("hex"),
  device: () => {
    const devices = [{
      brand: "realme",
      model: "RMX3890",
      product: "RMX3890INT"
    }, {
      brand: "Xiaomi",
      model: "2312DRA50G",
      product: "ruby_global"
    }, {
      brand: "Oppo",
      model: "CPH2527",
      product: "OP5965L1"
    }, {
      brand: "Samsung",
      model: "SM-A546B",
      product: "a54x"
    }];
    const dev = devices[Math.floor(Math.random() * devices.length)];
    return {
      ...dev,
      manufacturer: dev.brand,
      fingerprint: `${dev.brand}/${dev.product}/RE5C91L1:15/AQ3A.240812.002/U.R4T2.${Date.now()}:user/release-keys`
    };
  }
};
class DramaWave {
  constructor() {
    const dev = _rnd.device();
    this.state = {
      deviceId: randomUUID(),
      androidId: _rnd.androidId(),
      firebaseId: _rnd.firebaseId(),
      authKey: null,
      authSecret: null,
      userId: null,
      sessionId: randomUUID(),
      abExps: "962:3244,205:552,1001:3360,1115:3840,1154:3966,807:2618,534:1612,544:1646,1169:4024"
    };
    this.device = {
      brand: dev.brand,
      model: dev.model,
      product: dev.product,
      manufacturer: dev.manufacturer,
      fingerprint: dev.fingerprint,
      version: "35",
      screenW: "424",
      screenH: "941"
    };
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 15e3
    });
  }
  _md5(str) {
    return createHash("md5").update(str).digest("hex");
  }
  _getHeaders() {
    const headers = {
      "User-Agent": "okhttp/4.12.0",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      country: "ID",
      "device-country": "ID",
      language: "id-ID",
      "device-language": "id-ID",
      timezone: "+8",
      "device-id": this.state.deviceId,
      gaid: this.state.deviceId,
      "x-appsflyer_id": "1777275280259-11461114410353357",
      "appsflyer-id": "1777275280259-11461114410353357",
      "x-device-brand": this.device.brand,
      "x-device-model": this.device.model,
      "x-device-product": this.device.product,
      "x-device-manufacturer": this.device.manufacturer,
      "x-device-fingerprint": this.device.fingerprint,
      "device-version": this.device.version,
      "screen-width": this.device.screenW,
      "screen-height": this.device.screenH,
      "android-id": this.state.androidId,
      "network-type": "wifi",
      "app-name": "com.dramawave.app",
      "app-version": "9.9.9.9.9.9",
      "is-mainland": "false",
      "mcc-country": "510",
      device: "android",
      "session-id": this.state.sessionId,
      "firebase-id": this.state.firebaseId,
      "ab-exps": this.state.abExps
    };
    if (this.state.authKey && this.state.authSecret) {
      const ts = Date.now();
      const sig = this._md5(`${SALT}&${this.state.authSecret}`);
      headers["authorization"] = `oauth_signature=${sig},oauth_token=${this.state.authKey},ts=${ts}`;
    }
    return headers;
  }
  _deepParseJson(data) {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          return this._deepParseJson(parsed);
        }
        return parsed;
      } catch (e) {
        return data;
      }
    }
    if (Array.isArray(data)) {
      return data.map(item => this._deepParseJson(item));
    }
    if (data !== null && typeof data === "object") {
      const parsedObject = {};
      for (const [key, value] of Object.entries(data)) {
        parsedObject[key] = this._deepParseJson(value);
      }
      return parsedObject;
    }
    return data;
  }
  async _req(method, url, data = null, params = null) {
    if (!this.state.authKey && url !== "/anonymous/login") {
      await this.init();
    }
    try {
      const res = await this.client.request({
        method: method,
        url: url,
        headers: this._getHeaders(),
        data: data || undefined,
        params: params || undefined
      });
      return this._deepParseJson(res.data);
    } catch (e) {
      return {
        error: true,
        message: e.response?.data?.message || e.message
      };
    }
  }
  async _get(url, p) {
    return await this._req("get", url, null, p);
  }
  async _post(url, d) {
    return await this._req("post", url, d);
  }
  async init() {
    if (this._initializing) return this._initializing;
    this._initializing = (async () => {
      try {
        const sign = this._md5(SALT + this.state.deviceId);
        const res = await this._post("/anonymous/login", {
          device_id: this.state.deviceId,
          device_name: `${this.device.brand} ${this.device.model}`,
          sign: sign
        });
        if (res.code === 200 && res.data) {
          this.state.authKey = res.data.auth_key;
          this.state.authSecret = res.data.auth_secret;
          this.state.userId = res.data.user_id;
        }
        return res;
      } finally {
        this._initializing = null;
      }
    })();
    return this._initializing;
  }
  async login({
    type,
    ...rest
  }) {
    return await this._post("/user/login", {
      type: type,
      ...rest
    });
  }
  async pre_check({
    ...r
  }) {
    return await this._post("/user/login/pre_check", r);
  }
  async logout() {
    return await this._post("/user/logout", {});
  }
  async profile() {
    return await this._get("/user/profilev2");
  }
  async user_cfg() {
    return await this._get("/user/config");
  }
  async setting_cfg() {
    return await this._get("/user/setting/config");
  }
  async set_lang({
    language,
    ...rest
  }) {
    return await this._post("/user/setting/language", {
      language: language,
      ...rest
    });
  }
  async short_token() {
    return await this._get("/user/short_token");
  }
  async risk_check() {
    return await this._get("/user/risk/check");
  }
  async logoff({
    ...r
  }) {
    return await this._post("/user/logoff", r);
  }
  async dev_list() {
    return await this._get("/user/device/list");
  }
  async dev_logout({
    ...r
  }) {
    return await this._post("/user/device/logout", r);
  }
  async dev_rm_others({
    ...r
  }) {
    return await this._post("/user/device/remove_others", r);
  }
  async guide({
    type,
    ...rest
  }) {
    return await this._get("/welfare/v2/guide-login", {
      type: type,
      ...rest
    });
  }
  async block({
    ...r
  }) {
    return await this._post("/user/block", r);
  }
  async check_email({
    ...r
  }) {
    return await this._post("/user/email/check", r);
  }
  async ascribe({
    campaign,
    ...rest
  }) {
    return await this._get("/user/ascribe/status", {
      campaign: campaign,
      ...rest
    });
  }
  async edit_profile({
    ...r
  }) {
    return await this._post("/dm-api/user/edit", r);
  }
  async profile_func({
    ...r
  }) {
    return await this._get("/dm-api/user/profile/func", r);
  }
  async reel_transfer({
    ...r
  }) {
    return await this._post("/user/reel_user_transfer", r);
  }
  async upload_url({
    name,
    ...rest
  }) {
    return await this._get("/user/upload/url", {
      name: name,
      ...rest
    });
  }
  async net_cfg() {
    return await this._get("/user/net-check/conf");
  }
  async drama_info({
    series_id,
    ...rest
  }) {
    return await this._get("/drama/info_v2", {
      series_id: series_id,
      ...rest
    });
  }
  async drama_view({
    ...r
  }) {
    return await this._post("/drama/view", r);
  }
  async drama_view_time({
    ...r
  }) {
    return await this._post("/drama/view_time", r);
  }
  async drama_follow({
    ...r
  }) {
    return await this._post("/drama/follow", r);
  }
  async drama_batch_follow({
    ...r
  }) {
    return await this._post("/drama/batch-follow", r);
  }
  async drama_batch_unfollow({
    ...r
  }) {
    return await this._post("/drama/batch_unfollow_v2", r);
  }
  async drama_follow_list({
    ...r
  }) {
    return await this._get("/drama/v3/follow_list", r);
  }
  async drama_follow_fallback() {
    return await this._get("/drama/v3/follow_list_fallback");
  }
  async drama_history({
    ...r
  }) {
    return await this._get("/drama/v3/view_history", r);
  }
  async drama_actor({
    series_key,
    ...rest
  }) {
    return await this._get("/drama/actor", {
      series_key: series_key,
      ...rest
    });
  }
  async drama_price({
    series_id,
    ...rest
  }) {
    return await this._get("/drama/price", {
      series_id: series_id,
      ...rest
    });
  }
  async drama_unlock({
    ...r
  }) {
    return await this._post("/drama/unlock_episode", r);
  }
  async drama_batch_unlock({
    ...r
  }) {
    return await this._post("/drama/batch_unlock_episode", r);
  }
  async drama_multi_price({
    series_id,
    ...rest
  }) {
    return await this._get("/drama/multi_unlock/price", {
      series_id: series_id,
      ...rest
    });
  }
  async drama_label({
    type,
    ...rest
  }) {
    return await this._get("/drama/label", {
      type: type,
      ...rest
    });
  }
  async drama_dl({
    id,
    ...rest
  }) {
    return await this._get("/drama/download", {
      id: id,
      ...rest
    });
  }
  async drama_dl_v2({
    id,
    ...rest
  }) {
    return await this._get("/drama/v2/download", {
      id: id,
      ...rest
    });
  }
  async drama_roleplay({
    ...r
  }) {
    return await this._get("/drama/roleplay_list", r);
  }
  async drama_book_list({
    ...r
  }) {
    return await this._get("/drama/book-list", r);
  }
  async drama_booking({
    ...r
  }) {
    return await this._post("/drama/booking", r);
  }
  async drama_daily_offer() {
    return await this._get("/drama/daily-special-offers");
  }
  async drama_info_push({
    series_id,
    ...rest
  }) {
    return await this._get("/drama/info_push_v2", {
      series_id: series_id,
      ...rest
    });
  }
  async drama_unlock_tag({
    series_id,
    ...rest
  }) {
    return await this._get("/drama/unlock_tag", {
      series_id: series_id,
      ...rest
    });
  }
  async novel_info({
    novel_key,
    ...rest
  }) {
    return await this._get("/novel/info", {
      novel_key: novel_key,
      ...rest
    });
  }
  async novel_list({
    ...r
  }) {
    return await this._post("/novel/list", r);
  }
  async novel_chapters({
    novel_key,
    ...rest
  }) {
    return await this._get("/novel/chapter/list", {
      novel_key: novel_key,
      ...rest
    });
  }
  async novel_unlock({
    novel_key,
    ...rest
  }) {
    return await this._get("/novel/unlock/v2", {
      novel_key: novel_key,
      ...rest
    });
  }
  async novel_follow({
    ...r
  }) {
    return await this._post("/novel/follow", r);
  }
  async novel_history({
    ...r
  }) {
    return await this._get("/novel/view_history", r);
  }
  async novel_last_view() {
    return await this._get("/novel/latest-view");
  }
  async novel_free_remind({
    ...r
  }) {
    return await this._post("/novel/chapter/limited_free/remind", r);
  }
  async novel_progress({
    ...r
  }) {
    return await this._post("/novel/chapter/read_progress/report", r);
  }
  async novel_fonts({
    lang,
    ...rest
  }) {
    return await this._get("/novel/font/list", {
      lang: lang,
      ...rest
    });
  }
  async novel_adult_tips() {
    return await this._get("/novel/eighteen-popup-tips");
  }
  async novel_tab_index({
    ...r
  }) {
    return await this._get("/novel/tab/index", r);
  }
  async novel_tab_feed({
    ...r
  }) {
    return await this._post("/novel/tab/feed", r);
  }
  async search({
    keyword,
    ...rest
  }) {
    return await this._post("/search/drama", {
      keyword: keyword,
      ...rest
    });
  }
  async search_novel({
    keyword,
    ...rest
  }) {
    return await this._post("/search/novel", {
      keyword: keyword,
      ...rest
    });
  }
  async search_hot() {
    return await this._post("/search/hot-list", {});
  }
  async search_novel_hot() {
    return await this._post("/search/novel/hot-list", {});
  }
  async search_suggest({
    ...r
  }) {
    return await this._post("/search/suggestion", r || {});
  }
  async search_novel_suggest({
    ...r
  }) {
    return await this._post("/search/novel/suggestion", r || {});
  }
  async search_hot_words() {
    return await this._get("/search/hot_words");
  }
  async search_novel_hot_words() {
    return await this._get("/search/novel/hot_words");
  }
  async search_kw({
    ...r
  }) {
    return await this._post("/search/keywords", r);
  }
  async search_novel_kw({
    ...r
  }) {
    return await this._post("/search/novel/keywords", r);
  }
  async search_security({
    ...r
  }) {
    return await this._post("/search/security", r);
  }
  async home_tabs() {
    return await this._get("/homepage/v3/tab/list");
  }
  async home_tab_feed({
    ...r
  }) {
    return await this._post("/homepage/v2/tab/feed", r);
  }
  async home_tab_index({
    ...r
  }) {
    return await this._get("/homepage/v2/tab/index", r);
  }
  async home_rank({
    ...r
  }) {
    return await this._post("/homepage/v2/rank", r);
  }
  async home_rank_info({
    ...r
  }) {
    return await this._post("/homepage/v2/rank-info", r);
  }
  async home_vip_hot({
    ...r
  }) {
    return await this._post("/homepage/vip_hot_series", r);
  }
  async home_vip() {
    return await this._post("/homepage/vip_series", {});
  }
  async home_coming_soon({
    ...r
  }) {
    return await this._get("/coming-soon/list", r);
  }
  async home_feed_insert({
    ...r
  }) {
    return await this._post("/homepage/feed-insert", r);
  }
  async home_icon_cfg() {
    return await this._get("/homepage/icon_config");
  }
  async home_new_user_strat({
    ...r
  }) {
    return await this._post("/homepage/newuser/strategy", r);
  }
  async home_badge_report({
    ...r
  }) {
    return await this._post("/homepage/v3/tab/badge/report", r);
  }
  async home_res_cfg({
    ...r
  }) {
    return await this._post("/homepage/resource/filter", r);
  }
  async home_feed({
    ...r
  }) {
    return await this._post("/dm-api/home/module/feed", r);
  }
  async home_tab({
    ...r
  }) {
    return await this._get("/dm-api/home/tab", r);
  }
  async home_tab_items({
    ...r
  }) {
    return await this._post("/dm-api/homepage/v2/tab/item/list", r);
  }
  async theater_tabs() {
    return await this._get("/theater/tab/list");
  }
  async wallet_mine() {
    return await this._get("/wallet/my");
  }
  async wallet_products({
    ...r
  }) {
    return await this._get("/wallet/product/list/v2", r);
  }
  async wallet_sku() {
    return await this._get("/wallet/sku/list");
  }
  async wallet_vip_benefits() {
    return await this._get("/wallet/vip/benefits");
  }
  async wallet_vip_center({
    ...r
  }) {
    return await this._get("/wallet/vip/center_v2", r);
  }
  async wallet_auto_unlock({
    ...r
  }) {
    return await this._post("/wallet/autounlock/change", r);
  }
  async wallet_novel_unlock({
    ...r
  }) {
    return await this._post("/wallet/novelunlock/change", r);
  }
  async wallet_billing() {
    return await this._get("/wallet/third_billing/config");
  }
  async wallet_sub_page({
    ...r
  }) {
    return await this._post("/wallet/subscription/landing/page", r);
  }
  async wallet_sub_guide() {
    return await this._post("/wallet/subscription/guide/page", {});
  }
  async wallet_recharge({
    ...r
  }) {
    return await this._get("/wallet/recharge/list", r);
  }
  async wallet_rewards({
    ...r
  }) {
    return await this._get("/wallet/rewards/list", r);
  }
  async wallet_consumption({
    ...r
  }) {
    return await this._get("/wallet/consumption/list", r);
  }
  async welfare_list({
    ...r
  }) {
    return await this._get("/welfare/v2/list", r);
  }
  async welfare_receive({
    ...r
  }) {
    return await this._post("/welfare/v2/receive", r);
  }
  async welfare_sign({
    ...r
  }) {
    return await this._post("/welfare/v2/sign", r);
  }
  async welfare_exchange({
    ...r
  }) {
    return await this._post("/welfare/exchange/coins", r);
  }
  async welfare_shop_exchange({
    ...r
  }) {
    return await this._post("/welfare/v2/shop/exchange", r);
  }
  async welfare_chest() {
    return await this._get("/welfare/v2/treasure-chest");
  }
  async welfare_watch_vid() {
    return await this._get("/welfare/v2/watch-video");
  }
  async welfare_watch_report({
    ...r
  }) {
    return await this._post("/welfare/v2/watch-video-report", r);
  }
  async welfare_tasks() {
    return await this._get("/task/reward-list/v2");
  }
  async welfare_ad_tasks() {
    return await this._get("/task/ad-list");
  }
  async welfare_checkin({
    ...r
  }) {
    return await this._post("/task/daily-checkins", r);
  }
  async welfare_do_task({
    ...r
  }) {
    return await this._post("/task/do-task", r);
  }
  async welfare_batch_task({
    ...r
  }) {
    return await this._post("/task/batch-do-task", r);
  }
  async welfare_to_claim() {
    return await this._get("/task/reward-to-claim");
  }
  async welfare_bubble() {
    return await this._get("/welfare/v2/bubble");
  }
  async welfare_wallet() {
    return await this._get("/welfare/v2/wallet");
  }
  async comment_list({
    ...r
  }) {
    return await this._post("/content/comment/list", r);
  }
  async comment_sub({
    ...r
  }) {
    return await this._post("/content/comment/sub_list", r);
  }
  async comment_save({
    ...r
  }) {
    return await this._post("/content/comment/save", r);
  }
  async comment_del({
    ...r
  }) {
    return await this._post("/content/comment/delete", r);
  }
  async comment_like({
    ...r
  }) {
    return await this._post("/content/comment/like", r);
  }
  async comment_dislike({
    ...r
  }) {
    return await this._post("/content/comment/dislike", r);
  }
  async comment_stats({
    ...r
  }) {
    return await this._post("/content/comment/data", r);
  }
  async comment_report({
    ...r
  }) {
    return await this._post("/content/complain", r);
  }
  async barrage_switch({
    ...r
  }) {
    return await this._post("/content/barrage/open_status/switch", r);
  }
  async barrage_show({
    ...r
  }) {
    return await this._post("/content/barrage/show", r);
  }
  async msg_list({
    ...r
  }) {
    return await this._get("/content/message/list", r);
  }
  async msg_unread() {
    return await this._get("/content/message/unread");
  }
  async msg_mark({
    ...r
  }) {
    return await this._post("/content/message/mark", r);
  }
  async msg_read_all() {
    return await this._get("/content/message/read-all");
  }
  async point_list({
    ...r
  }) {
    return await this._get("/point/list", r);
  }
  async point_box() {
    return await this._get("/point/boxinfo");
  }
  async point_receive({
    ...r
  }) {
    return await this._post("/point/receive", r);
  }
  async point_redeem() {
    return await this._post("/point/redeem", {});
  }
  async point_redeem_vip({
    ...r
  }) {
    return await this._post("/point/redeem-vip", r);
  }
  async point_redeemed({
    ...r
  }) {
    return await this._get("/point/redeemed/list", r);
  }
  async point_vip_status() {
    return await this._get("/point/vip-card-status");
  }
  async popup_info({
    ...r
  }) {
    return await this._get("/popup/v2/info", r);
  }
  async popup_banners({
    ...r
  }) {
    return await this._post("/popup/banner/list", r);
  }
  async popup_coupon({
    ...r
  }) {
    return await this._post("/popup/coupon/get", r);
  }
  async popup_gold({
    ...r
  }) {
    return await this._post("/popup/goldfree/get", r);
  }
  async popup_report({
    ...r
  }) {
    return await this._post("/popup/report", r);
  }
  async ad_get({
    ...r
  }) {
    return await this._get("/ad/get", r);
  }
  async ad_finish({
    ...r
  }) {
    return await this._post("/ad/finish", r);
  }
  async ad_groups({
    ...r
  }) {
    return await this._get("/ad/group/list", r);
  }
  async ad_units() {
    return await this._get("/ad/unit/list");
  }
  async ad_value_report({
    ...r
  }) {
    return await this._post("/ad/value/report", r);
  }
  async ad_value_units() {
    return await this._get("/ad/value/units");
  }
  async ad_novel_get({
    ...r
  }) {
    return await this._get("/ad/novel/get", r);
  }
  async ad_novel_finish({
    ...r
  }) {
    return await this._post("/ad/novel/finish", r);
  }
  async ad_novel_groups({
    ...r
  }) {
    return await this._get("/ad/novel/group/list", r);
  }
  async sys_cfg() {
    return await this._get("/sys/config");
  }
  async sys_version() {
    return await this._post("/sys/version/latest", {});
  }
  async sys_app_cfg({
    ...r
  }) {
    return await this._get("/app/config", r);
  }
  async sys_cpu({
    ...r
  }) {
    return await this._post("/device/cpu_info", r);
  }
  async sys_foryou({
    ...r
  }) {
    return await this._get("/foryou/feed", r);
  }
  async sys_float() {
    return await this._get("/float/info");
  }
  async coupon_list({
    ...r
  }) {
    return await this._get("/coupon/list", r);
  }
  async coupon_create({
    ...r
  }) {
    return await this._post("/ticket/create", r);
  }
  async coupon_tickets({
    ...r
  }) {
    return await this._get("/ticket/list", r);
  }
  async coupon_is_show() {
    return await this._get("/ticket/is_show");
  }
  get_state() {
    return {
      state: this.state,
      device: this.device
    };
  }
}
export default async function handler(req, res) {
  const payload = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...params
  } = payload;
  const api = new DramaWave();
  const availableActions = Object.getOwnPropertyNames(Object.getPrototypeOf(api)).filter(name => typeof api[name] === "function" && name !== "constructor" && !name.startsWith("_")).sort();
  if (!action) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'action' wajib diisi.",
      available_actions: availableActions
    });
  }
  try {
    if (typeof api[action] === "function" && !action.startsWith("_")) {
      let result;
      if (action === "get_state") {
        result = api.get_state();
      } else {
        result = await api[action](params);
      }
      const finalData = result && typeof result === "object" ? result.data || result : {
        value: result
      };
      return res.status(200).json({
        status: true,
        action: action,
        ...typeof finalData === "object" ? finalData : {
          result: finalData
        }
      });
    } else {
      return res.status(404).json({
        status: false,
        error: `Action '${action}' tidak ditemukan atau bersifat internal.`,
        available_actions: availableActions
      });
    }
  } catch (error) {
    console.error(`[API Error] Action: ${action} |`, error.message);
    return res.status(500).json({
      status: false,
      action: action,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message
    });
  }
}