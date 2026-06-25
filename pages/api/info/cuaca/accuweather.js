import axios from "axios";
import ApiKey from "@/configs/api-key";
class AccuWeather {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.accuweather.com",
      headers: {
        "User-Agent": "okhttp/4.12.0"
      }
    });
    this.keys = ApiKey.accu;
    this.keyIndex = 0;
  }
  _getKey() {
    const idx = this.keyIndex % this.keys.length;
    return this.keys[idx];
  }
  _rotateKey() {
    if (this.keys.length > 1) {
      this.keyIndex++;
      const nextIdx = this.keyIndex % this.keys.length;
      console.warn(`[ROTASI KEY] Mengalihkan API Key ke indeks [${nextIdx}]: ${this.keys[nextIdx].substring(0, 5)}***`);
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
  _valid(val, allowed, fallback) {
    const parsed = typeof val === "number" ? String(val) : val;
    const isValid = allowed.includes(parsed);
    console.log(`[VALIDASI] Mencocokkan nilai "${val}": ${isValid ? "Valid" : `Tidak valid, gunakan fallback "${fallback}"`}`);
    return isValid ? parsed : fallback;
  }
  _matchQuery(q) {
    const cleanQ = q.trim();
    const latLonRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (latLonRegex.test(cleanQ)) {
      console.log(`[DETEKSI] Query "${cleanQ}" dideteksi sebagai: Koordinat Lat/Lon`);
      return "latlon";
    }
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-3]|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4][0-3]|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;
    if (ipRegex.test(cleanQ)) {
      console.log(`[DETEKSI] Query "${cleanQ}" dideteksi sebagai: IP Address`);
      return "ip";
    }
    console.log(`[DETEKSI] Query "${cleanQ}" dideteksi sebagai: Nama Kota`);
    return "city";
  }
  async ip(address) {
    try {
      console.log(`[PROSES] Mencari lokasi berdasarkan IP: ${address}`);
      const res = await this.api.get("/locations/v1/cities/ipaddress", {
        params: {
          apikey: this._getKey(),
          q: address,
          language: "id"
        }
      });
      return res?.data;
    } catch (err) {
      console.error(`[ERROR IP] ${err?.message ?? err}`);
      this._rotateKey();
      return null;
    }
  }
  async geo(lat, lon) {
    try {
      console.log(`[PROSES] Mencari geo-position untuk: ${lat}, ${lon}`);
      const res = await this.api.get("/locations/v1/cities/geoposition/search.json", {
        params: {
          apikey: this._getKey(),
          q: `${lat},${lon}`,
          language: "id"
        }
      });
      return res?.data;
    } catch (err) {
      console.error(`[ERROR GEO] ${err?.message ?? err}`);
      this._rotateKey();
      return null;
    }
  }
  async city(q) {
    try {
      console.log(`[PROSES] Mencari kota untuk query: ${q}`);
      const res = await this.api.get("/locations/v1/cities/search", {
        params: {
          apikey: this._getKey(),
          q: q,
          language: "id"
        }
      });
      return res?.data?.[0];
    } catch (err) {
      console.error(`[ERROR CITY] ${err?.message ?? err}`);
      this._rotateKey();
      return null;
    }
  }
  async search({
    query,
    lang,
    minute = "1",
    hourly = "72",
    daily = "10",
    historical = "24",
    indices = true,
    alerts = true,
    current = true,
    air_quality = true,
    imagery = true,
    tropical = false
  }) {
    try {
      console.log("[PROSES] Memulai proses pencarian cuaca dengan validasi & multi-key rotation...");
      const vMin = this._valid(minute, ["1", "15", "30", "45"], "1");
      const vHr = this._valid(hourly, ["1", "12", "24", "48", "72", "120"], "72");
      const vDay = this._valid(daily, ["1", "5", "10", "15", "25", "45"], "10");
      const vHist = this._valid(historical, ["6", "12", "24"], "24");
      const language = lang ?? "id";
      let locKey = "";
      let locData = null;
      let _lat = "-5.3009415";
      let _lon = "119.49046";
      if (query) {
        const type = this._matchQuery(query);
        if (type === "latlon") {
          const [parsedLat, parsedLon] = query.split(",").map(v => v.trim());
          _lat = parsedLat;
          _lon = parsedLon;
          locData = await this.geo(_lat, _lon);
          locKey = locData?.Key ?? "";
        } else if (type === "ip") {
          locData = await this.ip(query.trim());
          locKey = locData?.Key ?? "";
        } else {
          locData = await this.city(query.trim());
          locKey = locData?.Key ?? "";
        }
      } else {
        locData = await this.geo(_lat, _lon);
        locKey = locData?.Key ?? "";
      }
      if (!locKey) {
        console.error("[PROSES] Gagal mendapatkan Location Key.");
        return {
          error: true,
          message: "Location key tidak ditemukan berdasarkan parameter input."
        };
      }
      console.log(`[PROSES] Location Key diperoleh: ${locKey}. Menyusun antrean request...`);
      const tasks = [{
        id: "indices",
        run: !!indices,
        url: `/indices/v1/daily/${vDay}day/${locKey}/groups/58`,
        params: {
          details: true
        }
      }, {
        id: "hourly",
        run: !!hourly,
        url: `/forecasts/v1/hourly/${vHr}hour/${locKey}.json`,
        params: {
          details: true,
          metric: true
        }
      }, {
        id: "alerts",
        run: !!alerts,
        url: `/alerts/v1/${locKey}.json`,
        params: {
          details: true
        }
      }, {
        id: "minute_cast",
        run: minute !== false,
        url: `/forecasts/v1/minute/${vMin}minute`,
        params: {
          q: `${_lat},${_lon}`,
          details: true
        }
      }, {
        id: "daily",
        run: !!daily,
        url: `/forecasts/v1/daily/${vDay}day/${locKey}.json`,
        params: {
          details: true,
          metric: true
        }
      }, {
        id: "current",
        run: !!current,
        url: `/currentconditions/v1/${locKey}.json`,
        params: {
          details: true
        }
      }, {
        id: "air_quality",
        run: !!air_quality,
        url: `/airquality/v1/observations/${locKey}.json`,
        params: {}
      }, {
        id: "historical",
        run: historical !== false,
        url: `/currentconditions/v1/${locKey}/historical/${vHist}.json`,
        params: {
          details: true
        }
      }, {
        id: "imagery_radar",
        run: !!imagery,
        url: `/imagery/v1/maps/radars/static/${locKey}`,
        params: {
          imgsize: "medium"
        }
      }, {
        id: "tropical_cyclone",
        run: !!tropical,
        url: "/tropical/v1/gov/storms/active",
        params: {}
      }];
      const rawResult = {
        location: locData
      };
      for (const task of tasks) {
        if (!task.run) {
          console.log(`[PROSES] Skip endpoint: ${task.id}`);
          continue;
        }
        try {
          console.log(`[PROSES] Memanggil endpoint: ${task.id} -> ${task.url}`);
          const res = await this.api.get(task.url, {
            params: {
              apikey: this._getKey(),
              language: language,
              ...task.params
            }
          });
          if (res?.data) {
            rawResult[task.id] = res.data;
          }
        } catch (taskErr) {
          console.error(`[SKIP EROR] Gagal memuat ${task.id}: ${taskErr?.message ?? taskErr}`);
          this._rotateKey();
        }
      }
      console.log("[PROSES] Melakukan formatting snake_case hasil akhir");
      return this._snake(rawResult);
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
  const api = new AccuWeather();
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