import axios from "axios";
class WeawowAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://weawow.com",
      headers: {
        "User-Agent": "app_7.1.7",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      }
    });
    this.keys = ["wowza"];
    this.keyIndex = 0;
    this.contextMaps = {
      root: {
        b: "location",
        c: "current",
        h: "hourly",
        d: "daily",
        s: "sunMoon",
        m: "moon",
        shs: "shortSummary",
        q: "airQuality",
        ph: "photos",
        status: "status"
      },
      location: {
        a: "updateTime",
        b: "timestamp",
        c: "dayName",
        d: "sourceType",
        e: "timezoneOffset",
        f: "timezone",
        g: "locationId",
        h: "locationUrl",
        i: "cityName",
        j: "locationType",
        k: "lat",
        l: "lon",
        o: "units",
        p: "rainLabel",
        q: "snowLabel",
        r: "language",
        u: "provider"
      },
      units: {
        t: "temperature",
        s: "degree",
        r: "rain",
        v: "visibility",
        w: "windSpeed",
        p: "pressure",
        u: "someUnit",
        h: "hourFormat",
        c: "cloud",
        rh: "rainHour",
        rd: "rainDay",
        sh: "snowHour",
        sd: "snowDay"
      },
      current: {
        a: "condition",
        c: "temperature",
        d: "highTemp",
        e: "pressure",
        f: "humidity",
        g: "windSpeed",
        h: "windDirection",
        i: "uvIndex",
        j: "cloudCover",
        q: "windDirShort",
        u: "conditionCode"
      },
      hourlyItem: {
        a: "condition",
        c: "temperature",
        d: "highTemp",
        e: "pressure",
        f: "humidity",
        g: "windSpeed",
        h: "windDirection",
        i: "uvIndex",
        j: "cloudCover",
        l: "precip",
        q: "windDirShort",
        hc: "timestamp",
        hd: "day",
        he: "hour",
        u: "conditionCode"
      },
      dailyItem: {
        a: "condition",
        c: "tempMax",
        d: "tempMin",
        e: "pressure",
        f: "humidity",
        g: "precip",
        h: "windDirection",
        i: "uvIndex",
        j: "cloudCover",
        q: "windDirShort",
        t: "weatherCode",
        da: "dayShort",
        db: "dayLong",
        dc: "timestamp",
        u: "conditionCode",
        dh: "dh",
        di: "di"
      },
      shortSummaryItem: {
        a: "conditions",
        c: "temp",
        d: "highTemp",
        q: "windDirShort",
        se: "timeRange"
      },
      sunMoon: {
        a: "sunrise",
        b: "sunset",
        c: "c",
        d: "d",
        e: "e",
        f: "f",
        g: "g",
        h: "h",
        as: "sunriseAlt"
      },
      moon: {
        a: "moonPhase",
        b: "nextFullMoon",
        c: "nextNewMoon",
        d: "phaseName",
        e: "e"
      },
      photoItem: {
        c: "photographer",
        d: "photoId",
        g: "photoUrl"
      }
    };
  }
  _getKey() {
    const idx = this.keyIndex % this.keys.length;
    return this.keys[idx];
  }
  _rotateKey() {
    if (this.keys.length > 1) {
      this.keyIndex++;
      const nextIdx = this.keyIndex % this.keys.length;
      console.warn(`[ROTASI KEY] Mengalihkan ke key indeks [${nextIdx}] -> ${this.keys[nextIdx]}`);
    }
  }
  _snake(obj) {
    if (Array.isArray(obj)) return obj.map(v => this._snake(v));
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, k) => {
        const key = k.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
        return {
          ...acc,
          [key]: this._snake(obj[k])
        };
      }, {});
    }
    return obj;
  }
  _matchQuery(q) {
    const clean = q.trim();
    const latLonRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (latLonRegex.test(clean)) return "latlon";
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-3]|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4][0-3]|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;
    if (ipRegex.test(clean)) return "ip";
    return "city";
  }
  async _getLocationFromCity(cityName) {
    try {
      console.log(`[PROSES] Mencari kota via checkGeoAutocomplete: ${cityName}`);
      const res = await this.api.get("/v3/id/checkGeoAutocomplete", {
        params: {
          key: cityName,
          ms: Date.now()
        }
      });
      if (res.data?.status && res.data.l && res.data.l.length > 0) {
        const first = res.data.l[0];
        return {
          geoNameId: first.i,
          lat: parseFloat(first.t),
          lon: parseFloat(first.g),
          name: first.n,
          country: first.c,
          admin: first.a,
          countryCode: first.d || "",
          areaCode: first.e || ""
        };
      }
      return null;
    } catch (err) {
      console.error(`[ERROR CITY] ${err.message}`);
      return null;
    }
  }
  async _getLocationFromIP(ip) {
    try {
      console.log(`[PROSES] Mendapatkan lokasi IP via cloudfunction: ${ip}`);
      const res = await axios.get("https://us-central1-api-project-555679637032.cloudfunctions.net/getLocationWow", {
        headers: {
          "User-Agent": "okhttp/3.11.0",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          Key: "238wral4289"
        }
      });
      if (res.data?.status) {
        return {
          lat: parseFloat(res.data.la),
          lon: parseFloat(res.data.ln),
          country: res.data.co
        };
      }
      return null;
    } catch (err) {
      console.error(`[ERROR IP] ${err.message}`);
      return null;
    }
  }
  async _reverseGeocode(lat, lon) {
    try {
      console.log(`[PROSES] Reverse geocoding via Nominatim: (${lat}, ${lon})`);
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`;
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "WeawowAPI/1.1"
        }
      });
      const data = res.data;
      if (data && data.address) {
        const addr = data.address;
        return addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || "unknown";
      }
      return null;
    } catch (err) {
      console.error(`[ERROR REVERSE] ${err.message}`);
      return null;
    }
  }
  async _getWeaUrl(loc) {
    try {
      console.log(`[PROSES] Mendapatkan wea_url untuk geoNameId: ${loc.geoNameId}`);
      const res = await this.api.get("/v3/id/checkGeoNameInfo", {
        params: {
          geoNameId: loc.geoNameId,
          lat: loc.lat,
          lng: loc.lon,
          fcl: "A",
          countryName: loc.country || "",
          areaName: loc.admin || "",
          placeName: loc.name || "",
          countryCode: loc.countryCode || "",
          areaCode: loc.areaCode || "",
          en: loc.name || ""
        }
      });
      if (res.data?.status && res.data.wea_url) {
        return res.data.wea_url;
      }
      return null;
    } catch (err) {
      console.error(`[ERROR WEA_URL] ${err.message}`);
      return null;
    }
  }
  _parseByContext(obj, contextMap) {
    if (Array.isArray(obj)) return obj.map(item => this._parseByContext(item, contextMap));
    if (obj !== null && typeof obj === "object") {
      const parsedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const parsedKey = contextMap[key] || key;
        parsedObj[parsedKey] = value;
      }
      return parsedObj;
    }
    return obj;
  }
  _unpackParallelArray(targetObj, itemMap) {
    if (!targetObj || typeof targetObj !== "object") return [];
    const arrays = Object.entries(targetObj).filter(([_, val]) => Array.isArray(val));
    if (arrays.length === 0) return [];
    const maxLength = Math.max(...arrays.map(([_, arr]) => arr.length));
    const resultList = [];
    for (let i = 0; i < maxLength; i++) {
      const rowItem = {};
      for (const [key, arr] of arrays) {
        const parsedKey = itemMap[key] || key;
        rowItem[parsedKey] = arr[i] !== undefined ? arr[i] : null;
      }
      resultList.push(rowItem);
    }
    return resultList;
  }
  _transform(raw) {
    if (!raw || raw.status === false) return null;
    const maps = this.contextMaps;
    let result = {};
    for (const [key, value] of Object.entries(raw)) {
      const parsedKey = maps.root[key] || key;
      result[parsedKey] = value;
    }
    if (result.location) {
      let cleanLoc = this._parseByContext(result.location, maps.location);
      if (cleanLoc.units) {
        cleanLoc.units = this._parseByContext(cleanLoc.units, maps.units);
      }
      result.location = cleanLoc;
    }
    if (result.current) {
      result.current = this._parseByContext(result.current, maps.current);
    }
    if (result.sunMoon) {
      result.sunMoon = this._parseByContext(result.sunMoon, maps.sunMoon);
    }
    if (result.moon) {
      result.moon = this._parseByContext(result.moon, maps.moon);
    }
    if (result.hourly) {
      result.hourly = this._unpackParallelArray(result.hourly, maps.hourlyItem);
    }
    if (result.daily) {
      result.daily = this._unpackParallelArray(result.daily, maps.dailyItem);
    }
    if (result.shortSummary && result.shortSummary.shs) {
      const cleanSummaryItems = this._unpackParallelArray(result.shortSummary.shs, maps.shortSummaryItem);
      result.shortSummary = {
        status: result.shortSummary.s ?? true,
        summaries: [...cleanSummaryItems]
      };
    }
    if (result.airQuality) {
      const providerName = result.airQuality.b || "CAMS, ECMWF";
      const providerUrl = result.airQuality.c || "";
      const available = result.airQuality.a ?? true;
      let structuredAqi = {};
      if (result.airQuality.f && typeof result.airQuality.f === "object") {
        for (const [pollutant, data] of Object.entries(result.airQuality.f)) {
          if (data && Array.isArray(data.f)) {
            structuredAqi[pollutant] = [...data.f];
          } else {
            structuredAqi[pollutant] = data;
          }
        }
      }
      result.airQuality = {
        available: available,
        providerName: providerName,
        providerUrl: providerUrl,
        data: {
          ...structuredAqi
        }
      };
    }
    if (result.photos && Array.isArray(result.photos)) {
      result.photos = result.photos.map(item => this._parseByContext(item, maps.photoItem));
    }
    const allowedRoots = ["location", "current", "hourly", "daily", "shortSummary", "sunMoon", "moon", "airQuality", "photos", "status"];
    Object.keys(result).forEach(key => {
      if (!allowedRoots.includes(key)) delete result[key];
    });
    return result;
  }
  async search({
    query,
    location = true,
    current = true,
    hourly = true,
    daily = true,
    sun_moon = true,
    moon = true,
    short_summary = true,
    air_quality = true,
    photos = true,
    style_template = false
  }) {
    try {
      console.log("[PROSES] Memulai pencarian cuaca terikat skema parameter curl murni...");
      let locationInfo = null;
      if (query) {
        const type = this._matchQuery(query);
        if (type === "latlon") {
          const [parsedLat, parsedLon] = query.split(",").map(v => v.trim());
          const cityName = await this._reverseGeocode(parsedLat, parsedLon);
          locationInfo = await this._getLocationFromCity(cityName && cityName !== "unknown" ? cityName : "Makassar");
        } else if (type === "ip") {
          const ipLoc = await this._getLocationFromIP(query.trim());
          if (ipLoc) {
            const cityName = await this._reverseGeocode(ipLoc.lat, ipLoc.lon);
            locationInfo = await this._getLocationFromCity(cityName && cityName !== "unknown" ? cityName : "Makassar");
          } else {
            locationInfo = await this._getLocationFromCity("Makassar");
          }
        } else {
          locationInfo = await this._getLocationFromCity(query.trim());
        }
      } else {
        locationInfo = await this._getLocationFromCity("Makassar");
      }
      if (!locationInfo || !locationInfo.geoNameId) {
        return {
          error: true,
          message: "Location info tidak ditemukan berdasarkan parameter input."
        };
      }
      const weaUrl = await this._getWeaUrl(locationInfo);
      if (!weaUrl) {
        return {
          error: true,
          message: "Url Weawow tidak ditemukan untuk koordinat target."
        };
      }
      console.log(`[PROSES] wea_url diperoleh: ${weaUrl}. Menyusun antrean request...`);
      const tasks = [{
        id: "weather_main",
        run: true,
        url: "/v5/id/weather",
        config: {
          params: {
            weaUrl: weaUrl,
            c: "e",
            p: "e",
            t: "a",
            tp: "k:l:n",
            k: this._getKey(),
            ut: "c",
            ud: "km",
            uw: "ms",
            up: "hPa",
            ur: "mm",
            uh: "24H"
          }
        }
      }, {
        id: "style_template",
        run: !!style_template,
        url: "https://design.weawow.com/l_maps/style_template_v2.json",
        config: {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 15)",
            Origin: "https://weawow.com",
            Referer: "https://weawow.com/"
          }
        }
      }];
      let rawResult = null;
      for (const task of tasks) {
        if (!task.run) {
          console.log(`[PROSES] Skip endpoint: ${task.id}`);
          continue;
        }
        try {
          console.log(`[PROSES] Memanggil endpoint: ${task.id} -> ${task.url}`);
          const res = await this.api.get(task.url, task.config);
          if (task.id === "weather_main") {
            if (res?.data && res.data.status !== false) {
              rawResult = res.data;
            } else {
              console.error("[PROSES] Endpoint weather_main mengembalikan status: false");
              this._rotateKey();
            }
          } else if (res?.data) {
            if (!rawResult) rawResult = {};
            rawResult[task.id] = res.data;
          }
        } catch (taskErr) {
          console.error(`[SKIP EROR] Gagal memuat ${task.id}: ${taskErr?.message ?? taskErr}`);
          if (task.id === "weather_main") this._rotateKey();
        }
      }
      if (!rawResult || rawResult.status === false) {
        return {
          error: true,
          message: "Server Weawow menolak request (status: false). Periksa keabsahan apikey atau weaUrl token.",
          location_info: locationInfo
        };
      }
      console.log("[PROSES] Melakukan formatting snake_case hasil akhir");
      const transformed = this._transform(rawResult);
      if (transformed) {
        if (!location) delete transformed.location;
        if (!current) delete transformed.current;
        if (!hourly) delete transformed.hourly;
        if (!daily) delete transformed.daily;
        if (!sun_moon) delete transformed.sun_moon;
        if (!moon) delete transformed.moon;
        if (!short_summary) delete transformed.short_summary;
        if (!air_quality) delete transformed.air_quality;
        if (!photos) delete transformed.photos;
        transformed.location_info = locationInfo;
      }
      return this._snake(transformed);
    } catch (error) {
      console.error("[ERROR] Terjadi kegagalan fatal pada pencarian:", error?.message ?? error);
      return {
        error: true,
        message: error?.message ?? error
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new WeawowAPI();
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