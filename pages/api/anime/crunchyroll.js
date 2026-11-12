import fetch from "node-fetch";
import {
  randomUUID
} from "crypto";

function getOptanonDate() {
  const date = new Date();
  const formattedDate = date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).replace(/, /g, "+").replace(/:/g, "%3A").replace(/\//g, "+");
  const timezoneName = "Waktu+Indonesia+Tengah";
  const tzOffset = date.getTimezoneOffset();
  const sign = tzOffset > 0 ? "-" : "+";
  const absOffset = Math.abs(tzOffset);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMinutes = String(absOffset % 60).padStart(2, "0");
  const gmtOffset = `GMT${sign}${offsetHours}${offsetMinutes}`;
  return `${formattedDate}+${gmtOffset}+(${timezoneName})`;
}

function buildQueryUrl(baseUrl, params) {
  const query = Object.keys(params).filter(key => params[key] !== undefined && params[key] !== null).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
  return query ? `${baseUrl}?${query}` : baseUrl;
}
class CrunchyrollAPI {
  constructor() {
    this.baseURL = "https://beta-api.crunchyroll.com";
    this.staticURL = "https://static.crunchyroll.com";
    this.drmURL = "https://cr-play-service.prd.crunchyrollsvc.com";
    this.token = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
    this.accountId = null;
    this.cookies = null;
  }
  isTokenValid() {
    return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }
  _getClientHeaders() {
    const deviceId = randomUUID();
    const anonymousId = randomUUID();
    const consentId = randomUUID();
    const datestamp = getOptanonDate();
    const cookieValue = [`device_id=${deviceId}`, `ajs_anonymous_id=${anonymousId}`, `c_locale=id-ID`, `OptanonConsent=isGpcEnabled=0&datestamp=${datestamp}&version=202601.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&genVendors=V1%3A0%2CV17%3A0%2CV11%3A0%2CV3%3A0%2CV7%3A0%2CV2%3A0%2C&consentId=${consentId}&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&intType=1&geolocation=%3B&AwaitingReconsent=false`].join("; ");
    return {
      cookie: cookieValue,
      "etp-anonymous-id": anonymousId,
      accept: "application/json, text/plain, */*",
      origin: "https://www.crunchyroll.com",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _getAuthHeaders() {
    await this.ensureAuth();
    const clientHeaders = this._getClientHeaders();
    clientHeaders.authorization = `Bearer ${this.token}`;
    return clientHeaders;
  }
  async getToken() {
    try {
      const response = await fetch("https://beta-api.crunchyroll.com/auth/v1/token", {
        headers: {
          authorization: "Basic Y3Jfd2ViOg==",
          "content-type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_id",
        method: "POST"
      });
      if (!response.ok) {
        console.error(`Failed to fetch token: ${response.status} ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching token: ${error}`);
      return null;
    }
  }
  async ensureAuth() {
    if (this.isTokenValid()) return;
    try {
      console.log("⏳ Auto authenticating with Client ID Token...");
      const data = await this.getToken();
      this.token = data?.access_token || data?.token;
      this.tokenExpiry = Date.now() + ((data?.expires_in || 3600) - 60) * 1e3;
      console.log("✅ Client Auth success");
    } catch (err) {
      console.error("❌ Client Auth error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async login({
    username,
    password,
    ...rest
  }) {
    try {
      console.log("⏳ Logging in with credentials...");
      const headers = {
        Authorization: "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const body = new URLSearchParams({
        username: username,
        password: password,
        grant_type: "password",
        scope: "offline_access"
      }).toString();
      const response = await fetch(`${this.baseURL}/auth/v1/token`, {
        method: "POST",
        headers: headers,
        body: body
      });
      if (!response.ok) throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1e3;
      this.accountId = data.account_id;
      console.log("✅ Login success");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Login error:", err.message);
      throw err;
    }
  }
  async refreshAccessToken({
    refresh_token,
    ...rest
  }) {
    try {
      console.log("⏳ Refreshing token...");
      const headers = {
        Authorization: "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const body = new URLSearchParams({
        refresh_token: refresh_token || this.refreshToken,
        grant_type: "refresh_token",
        scope: "offline_access"
      }).toString();
      const response = await fetch(`${this.baseURL}/auth/v1/token`, {
        method: "POST",
        headers: headers,
        body: body
      });
      if (!response.ok) throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1e3;
      console.log("✅ Token refreshed");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Refresh error:", err.message);
      throw err;
    }
  }
  async profile({
    token,
    token_expiry,
    ...rest
  }) {
    try {
      console.log("⏳ Getting profile...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${this.baseURL}/accounts/v1/me/profile`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Profile failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Profile retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Profile error:", err.message);
      throw err;
    }
  }
  async profiles({
    token,
    token_expiry,
    ...rest
  }) {
    try {
      console.log("⏳ Getting profiles...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${this.baseURL}/accounts/v1/me/multiprofile`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Profiles failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Profiles retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Profiles error:", err.message);
      throw err;
    }
  }
  async set_profile({
    token,
    token_expiry,
    profile_data,
    ...rest
  }) {
    try {
      console.log("⏳ Updating profile...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      headers["content-type"] = "application/json";
      const response = await fetch(`${this.baseURL}/accounts/v1/me/profile`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify(profile_data)
      });
      if (!response.ok) throw new Error(`Set profile failed: ${response.status} ${response.statusText}`);
      const data = await response.text();
      console.log("✅ Profile updated");
      return {
        success: true,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Set profile error:", err.message);
      throw err;
    }
  }
  async switch_profile({
    token,
    token_expiry,
    refresh_token,
    profile_id,
    ...rest
  }) {
    try {
      console.log("⏳ Switching profile...");
      const headers = {
        Authorization: "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const body = new URLSearchParams({
        refresh_token: refresh_token || this.refreshToken,
        grant_type: "refresh_token_profile_id",
        profile_id: profile_id,
        scope: "offline_access"
      }).toString();
      const response = await fetch(`${this.baseURL}/auth/v1/token`, {
        method: "POST",
        headers: headers,
        body: body
      });
      if (!response.ok) throw new Error(`Switch profile failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      this.token = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1e3;
      console.log("✅ Profile switched");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Switch profile error:", err.message);
      throw err;
    }
  }
  async get_cookies({
    token,
    token_expiry,
    ...rest
  }) {
    try {
      console.log("⏳ Getting cookies/index...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${this.baseURL}/index/v2`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Get cookies failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      this.cookies = {
        bucket: data.cms?.bucket || "",
        signature: data.cms?.signature || "",
        policy: data.cms?.policy || "",
        key_pair_id: data.cms?.key_pair_id || ""
      };
      console.log("✅ Cookies retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Get cookies error:", err.message);
      throw err;
    }
  }
  async home_feed({
    token,
    token_expiry,
    account_id,
    start = 0,
    n = 100,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting home feed...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/${account_id}/home_feed`, {
        start: start,
        n: n,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Home feed failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Home feed retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Home feed error:", err.message);
      throw err;
    }
  }
  async playheads({
    token,
    token_expiry,
    account_id,
    content_ids,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting playheads...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/playheads`, {
        content_ids: content_ids,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Playheads failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Playheads retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Playheads error:", err.message);
      throw err;
    }
  }
  async set_playhead({
    token,
    token_expiry,
    account_id,
    playhead_data,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Setting playhead...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      headers["content-type"] = "application/json";
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/playheads`, {
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(playhead_data)
      });
      if (!response.ok) throw new Error(`Set playhead failed: ${response.status} ${response.statusText}`);
      const data = await response.text();
      console.log("✅ Playhead set");
      return {
        success: true,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Set playhead error:", err.message);
      throw err;
    }
  }
  async video_streams({
    cookies,
    video_id,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting video streams...");
      const url = buildQueryUrl(`${this.baseURL}/cms/v2${cookies.bucket}/videos/${video_id}/streams`, {
        Signature: cookies.signature,
        Policy: cookies.policy,
        "Key-Pair-Id": cookies.key_pair_id
      });
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      if (!response.ok) throw new Error(`Video streams failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Video streams retrieved");
      return data;
    } catch (err) {
      console.error("❌ Video streams error:", err.message);
      throw err;
    }
  }
  async video_streams_v2({
    token,
    token_expiry,
    video_id,
    ...rest
  }) {
    try {
      console.log("⏳ Getting video streams v2 (DRM)...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const response = await fetch(`${this.drmURL}/v1/${video_id}/tv/samsung/play`, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Video streams v2 failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Video streams v2 retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Video streams v2 error:", err.message);
      throw err;
    }
  }
  async watch_history({
    token,
    token_expiry,
    account_id,
    page_size = 100,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting watch history...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/watch-history`, {
        page_size: page_size,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Watch history failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Watch history retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Watch history error:", err.message);
      throw err;
    }
  }
  async languages({
    type = "subtitle",
    ...rest
  }) {
    try {
      console.log(`⏳ Getting ${type} languages...`);
      const filename = type === "subtitle" ? "timed_text_languages.json" : "audio_languages.json";
      const url = `${this.staticURL}/config/i18n/v3/${filename}`;
      const response = await fetch(url, {
        method: "GET"
      });
      if (!response.ok) throw new Error(`Languages failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Languages retrieved");
      return data;
    } catch (err) {
      console.error("❌ Languages error:", err.message);
      throw err;
    }
  }
  async intro({
    media_id,
    ...rest
  }) {
    try {
      console.log("⏳ Getting intro/skip events...");
      const url = `${this.staticURL}/skip-events/production/${media_id}.json`;
      const response = await fetch(url, {
        method: "GET"
      });
      if (!response.ok) throw new Error(`Intro failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Intro retrieved");
      return data;
    } catch (err) {
      console.error("❌ Intro error:", err.message);
      throw err;
    }
  }
  async tenant_categories({
    token,
    token_expiry,
    include_subcategories = true,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting tenant categories...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v1/tenant_categories`, {
        include_subcategories: include_subcategories,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Tenant categories failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Tenant categories retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Tenant categories error:", err.message);
      throw err;
    }
  }
  async custom_lists({
    token,
    token_expiry,
    account_id,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting custom lists...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/custom-lists`, {
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Custom lists failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Custom lists retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Custom lists error:", err.message);
      throw err;
    }
  }
  async custom_list_items({
    token,
    token_expiry,
    account_id,
    list_id,
    ratings = true,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting custom list items...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/custom-lists/${list_id}`, {
        ratings: ratings,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Custom list items failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Custom list items retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Custom list items error:", err.message);
      throw err;
    }
  }
  async watchlist({
    token,
    token_expiry,
    account_id,
    order = "desc",
    n = 1e3,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting watchlist...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/${account_id}/watchlist`, {
        order: order,
        n: n,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Watchlist failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Watchlist retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Watchlist error:", err.message);
      throw err;
    }
  }
  async in_watchlist({
    token,
    token_expiry,
    account_id,
    content_ids,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Checking watchlist...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/watchlist`, {
        content_ids: content_ids,
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`In watchlist failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Watchlist checked");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ In watchlist error:", err.message);
      throw err;
    }
  }
  async add_watchlist({
    token,
    token_expiry,
    account_id,
    content_id,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Adding to watchlist...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      headers["content-type"] = "application/json";
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/watchlist`, {
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          content_id: content_id
        })
      });
      if (!response.ok) throw new Error(`Add watchlist failed: ${response.status} ${response.statusText}`);
      const data = await response.text();
      console.log("✅ Added to watchlist");
      return {
        success: true,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Add watchlist error:", err.message);
      throw err;
    }
  }
  async remove_watchlist({
    token,
    token_expiry,
    account_id,
    content_id,
    preferred_audio_language = "ja-JP",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Removing from watchlist...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/${account_id}/watchlist/${content_id}`, {
        preferred_audio_language: preferred_audio_language,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "DELETE",
        headers: headers
      });
      if (!response.ok) throw new Error(`Remove watchlist failed: ${response.status} ${response.statusText}`);
      const data = await response.text();
      console.log("✅ Removed from watchlist");
      return {
        success: true,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Remove watchlist error:", err.message);
      throw err;
    }
  }
  async search({
    token,
    token_expiry,
    q,
    n = 6,
    type = "music,series,episode,top_results,movie_listing",
    ratings = true,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Searching...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/search`, {
        q: q,
        n: n,
        type: type,
        ratings: ratings,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Search complete");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Search error:", err.message);
      throw err;
    }
  }
  async tags({
    token,
    token_expiry,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting seasonal tags...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/seasonal_tags`, {
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Tags failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Tags retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Tags error:", err.message);
      throw err;
    }
  }
  async browse({
    token,
    token_expiry,
    sort_by = "alphabetical",
    ratings = true,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Browsing...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/browse/index`, {
        sort_by: sort_by,
        ratings: ratings,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Browse failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Browse complete");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Browse error:", err.message);
      throw err;
    }
  }
  async rating({
    token,
    token_expiry,
    series_id,
    ...rest
  }) {
    try {
      console.log("⏳ Getting rating...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content-reviews/v3/rating/series/${series_id}`, {
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Rating failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Rating retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Rating error:", err.message);
      throw err;
    }
  }
  async seasons({
    token,
    token_expiry,
    series_id,
    force_locale = "",
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting seasons...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/cms/series/${series_id}/seasons`, {
        force_locale: force_locale,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Seasons failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Seasons retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Seasons error:", err.message);
      throw err;
    }
  }
  async categories({
    token,
    token_expiry,
    guid,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting categories...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/categories`, {
        guid: guid,
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Categories failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Categories retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Categories error:", err.message);
      throw err;
    }
  }
  async up_next({
    token,
    token_expiry,
    series_id,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting up next...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/up_next/${series_id}`, {
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Up Next failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Up next retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Up next error:", err.message);
      throw err;
    }
  }
  async episodes({
    token,
    token_expiry,
    season_id,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting episodes...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/cms/seasons/${season_id}/episodes`, {
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Episodes failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Episodes retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Episodes error:", err.message);
      throw err;
    }
  }
  async prev_episode({
    token,
    token_expiry,
    episode_id,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting previous episode...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/discover/previous_episode/${episode_id}`, {
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Previous Episode failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Previous episode retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Previous episode error:", err.message);
      throw err;
    }
  }
  async series({
    token,
    token_expiry,
    series_id,
    locale = "id-ID",
    ...rest
  }) {
    try {
      console.log("⏳ Getting series...");
      this.token = token;
      this.tokenExpiry = token_expiry;
      const headers = await this._getAuthHeaders();
      const url = buildQueryUrl(`${this.baseURL}/content/v2/cms/series/${series_id}`, {
        locale: locale,
        ...rest
      });
      const response = await fetch(url, {
        method: "GET",
        headers: headers
      });
      if (!response.ok) throw new Error(`Series failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log("✅ Series retrieved");
      return {
        ...data,
        token: this.token,
        token_expiry: this.tokenExpiry
      };
    } catch (err) {
      console.error("❌ Series error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["login", "refresh", "profile", "profiles", "set_profile", "switch_profile", "search", "tags", "browse", "rating", "seasons", "categories", "up_next", "episodes", "prev_episode", "series", "tenant_categories", "home_feed", "get_cookies", "playheads", "set_playhead", "watch_history", "watchlist", "in_watchlist", "add_watchlist", "remove_watchlist", "custom_lists", "custom_list_items", "video_streams", "video_streams_v2", "languages", "intro"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&q=isekai"
      }
    });
  }
  const api = new CrunchyrollAPI();
  try {
    let response;
    switch (action) {
      case "login":
        if (!params.username || !params.password) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'username' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params);
        break;
      case "refresh":
        if (!params.refresh_token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'refresh_token' wajib diisi untuk action 'refresh'."
          });
        }
        response = await api.refreshAccessToken(params);
        break;
      case "profile":
        response = await api.profile(params);
        break;
      case "profiles":
        response = await api.profiles(params);
        break;
      case "set_profile":
        if (!params.profile_data) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'profile_data' wajib diisi untuk action 'set_profile'."
          });
        }
        response = await api.set_profile(params);
        break;
      case "switch_profile":
        if (!params.profile_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'profile_id' wajib diisi untuk action 'switch_profile'."
          });
        }
        response = await api.switch_profile(params);
        break;
      case "search":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "tags":
        response = await api.tags(params);
        break;
      case "browse":
        response = await api.browse(params);
        break;
      case "rating":
        if (!params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_id' wajib diisi untuk action 'rating'."
          });
        }
        response = await api.rating(params);
        break;
      case "seasons":
        if (!params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_id' wajib diisi untuk action 'seasons'."
          });
        }
        response = await api.seasons(params);
        break;
      case "categories":
        if (!params.guid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'guid' wajib diisi untuk action 'categories'."
          });
        }
        response = await api.categories(params);
        break;
      case "up_next":
        if (!params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_id' wajib diisi untuk action 'up_next'."
          });
        }
        response = await api.up_next(params);
        break;
      case "episodes":
        if (!params.season_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'season_id' wajib diisi untuk action 'episodes'."
          });
        }
        response = await api.episodes(params);
        break;
      case "prev_episode":
        if (!params.episode_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'episode_id' wajib diisi untuk action 'prev_episode'."
          });
        }
        response = await api.prev_episode(params);
        break;
      case "series":
        if (!params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_id' wajib diisi untuk action 'series'."
          });
        }
        response = await api.series(params);
        break;
      case "tenant_categories":
        response = await api.tenant_categories(params);
        break;
      case "home_feed":
        if (!params.account_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' wajib diisi untuk action 'home_feed'."
          });
        }
        response = await api.home_feed(params);
        break;
      case "get_cookies":
        response = await api.get_cookies(params);
        break;
      case "playheads":
        if (!params.account_id || !params.content_ids) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'content_ids' wajib diisi untuk action 'playheads'."
          });
        }
        response = await api.playheads(params);
        break;
      case "set_playhead":
        if (!params.account_id || !params.playhead_data) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'playhead_data' wajib diisi untuk action 'set_playhead'."
          });
        }
        response = await api.set_playhead(params);
        break;
      case "watch_history":
        if (!params.account_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' wajib diisi untuk action 'watch_history'."
          });
        }
        response = await api.watch_history(params);
        break;
      case "watchlist":
        if (!params.account_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' wajib diisi untuk action 'watchlist'."
          });
        }
        response = await api.watchlist(params);
        break;
      case "in_watchlist":
        if (!params.account_id || !params.content_ids) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'content_ids' wajib diisi untuk action 'in_watchlist'."
          });
        }
        response = await api.in_watchlist(params);
        break;
      case "add_watchlist":
        if (!params.account_id || !params.content_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'content_id' wajib diisi untuk action 'add_watchlist'."
          });
        }
        response = await api.add_watchlist(params);
        break;
      case "remove_watchlist":
        if (!params.account_id || !params.content_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'content_id' wajib diisi untuk action 'remove_watchlist'."
          });
        }
        response = await api.remove_watchlist(params);
        break;
      case "custom_lists":
        if (!params.account_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' wajib diisi untuk action 'custom_lists'."
          });
        }
        response = await api.custom_lists(params);
        break;
      case "custom_list_items":
        if (!params.account_id || !params.list_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'account_id' dan 'list_id' wajib diisi untuk action 'custom_list_items'."
          });
        }
        response = await api.custom_list_items(params);
        break;
      case "video_streams":
        if (!params.cookies || !params.video_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'cookies' dan 'video_id' wajib diisi untuk action 'video_streams'."
          });
        }
        response = await api.video_streams(params);
        break;
      case "video_streams_v2":
        if (!params.video_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'video_id' wajib diisi untuk action 'video_streams_v2'."
          });
        }
        response = await api.video_streams_v2(params);
        break;
      case "languages":
        response = await api.languages(params);
        break;
      case "intro":
        if (!params.media_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'media_id' wajib diisi untuk action 'intro'."
          });
        }
        response = await api.intro(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}