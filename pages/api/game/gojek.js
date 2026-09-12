import axios from "axios";
class OjekEngine {
  constructor() {
    this.http = axios.create({
      timeout: 3e4
    });
    this.api = {
      route: "https://router.project-osrm.org/route/v1/driving",
      geo: "https://nominatim.openstreetmap.org/search",
      rev: "https://nominatim.openstreetmap.org/reverse"
    };
    this.cats = ["cafe", "restaurant", "hospital", "school", "market", "mosque", "park"];
    this.badges = [{
      t: 1,
      i: "🛵",
      l: "Driver Baru"
    }, {
      t: 5,
      i: "⭐",
      l: "Driver Aktif"
    }, {
      t: 10,
      i: "🔥",
      l: "Driver Handal"
    }, {
      t: 25,
      i: "💎",
      l: "Driver Elite"
    }, {
      t: 50,
      i: "👑",
      l: "Driver Legendaris"
    }];
  }
  genId() {
    return "Ojek-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  enc(o) {
    return Buffer.from(JSON.stringify(o)).toString("base64");
  }
  dec(s) {
    try {
      return s ? JSON.parse(Buffer.from(s, "base64").toString()) : null;
    } catch {
      return null;
    }
  }
  decodePoly(str) {
    let idx = 0,
      lat = 0,
      lng = 0,
      coords = [],
      shift = 0,
      res = 0,
      b = null;
    while (idx < str.length) {
      shift = 0;
      res = 0;
      do {
        b = str.charCodeAt(idx++) - 63;
        res |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lat += res & 1 ? ~(res >> 1) : res >> 1;
      shift = 0;
      res = 0;
      do {
        b = str.charCodeAt(idx++) - 63;
        res |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lng += res & 1 ? ~(res >> 1) : res >> 1;
      coords.push({
        lat: lat / 1e5,
        lon: lng / 1e5
      });
    }
    return coords;
  }
  getBboxAndSpan(coords, marginFactor = 1.2) {
    if (!coords.length) return {
      ll: null,
      spn: null
    };
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    for (const c of coords) {
      minLat = Math.min(minLat, c.lat);
      maxLat = Math.max(maxLat, c.lat);
      minLon = Math.min(minLon, c.lon);
      maxLon = Math.max(maxLon, c.lon);
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    let spanLat = (maxLat - minLat) * marginFactor;
    let spanLon = (maxLon - minLon) * marginFactor;
    if (spanLat < .001) spanLat = .001;
    if (spanLon < .001) spanLon = .001;
    return {
      ll: `${centerLon},${centerLat}`,
      spn: `${spanLon},${spanLat}`
    };
  }
  buildMap(pStart, pEnd, encodedPoly, prog) {
    const coords = this.decodePoly(encodedPoly);
    if (!coords.length) return this.fallbackMap(pStart, pEnd);
    const curIdx = Math.min(coords.length - 1, Math.floor(prog / 100 * (coords.length - 1)));
    const driver = coords[curIdx] || pStart;
    const remaining = coords.slice(curIdx);
    const sample = arr => {
      if (arr.length <= 30) return arr;
      let step = Math.ceil(arr.length / 30),
        res = [];
      for (let i = 0; i < arr.length; i += step) res.push(arr[i]);
      if (res[res.length - 1] !== arr[arr.length - 1]) res.push(arr[arr.length - 1]);
      return res;
    };
    const bluePoints = sample(remaining).map(c => `${c.lon},${c.lat}`).join(",");
    const plBlue = bluePoints ? `&pl=c:0066FF,w:6,${bluePoints}` : "";
    const pts = `${pStart.lon},${pStart.lat},pm2rdm~${pEnd.lon},${pEnd.lat},pm2blm~${driver.lon},${driver.lat},pm2gnm`;
    const {
      ll,
      spn
    } = this.getBboxAndSpan(coords);
    const viewport = ll && spn ? `&ll=${ll}&spn=${spn}` : "";
    const base = `size=650,450&pt=${pts}${plBlue}${viewport}&lang=id_ID`;
    return {
      normal: `https://static-maps.yandex.ru/1.x/?l=map,trf&${base}`,
      sat: `https://static-maps.yandex.ru/1.x/?l=sat,trf&${base}`,
      nav: `https://yandex.com/maps/?rtext=${driver.lat},${driver.lon}~${pEnd.lat},${pEnd.lon}&rtt=auto`
    };
  }
  fallbackMap(pStart, pEnd) {
    const pts = `${pStart.lon},${pStart.lat},pm2rdm~${pEnd.lon},${pEnd.lat},pm2blm`;
    const base = `size=650,450&pt=${pts}&lang=id_ID`;
    return {
      normal: `https://static-maps.yandex.ru/1.x/?l=map,trf&${base}`,
      sat: `https://static-maps.yandex.ru/1.x/?l=sat,trf&${base}`,
      nav: `https://yandex.com/maps/?rtext=${pStart.lat},${pStart.lon}~${pEnd.lat},${pEnd.lon}&rtt=auto`
    };
  }
  drvInfo(state) {
    const badge = this.badges.reduce((a, b) => state.total_trips >= b.t ? b : a, this.badges[0]);
    return {
      id: state.user_id,
      lvl: state.level,
      xp: state.xp,
      xpNext: state.level * 200 - state.xp,
      trips: state.total_trips,
      saldo: `Rp ${state.balance.toLocaleString()}`,
      badge: `${badge.i} ${badge.l}`,
      status: state.active_trip ? "On Trip" : "Ready"
    };
  }
  fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
  async locDetail(lat, lon) {
    try {
      const res = await this.http.get(this.api.rev, {
        params: {
          lat: lat,
          lon: lon,
          format: "json",
          addressdetails: 1,
          zoom: 18,
          "accept-language": "id"
        },
        headers: {
          "User-Agent": "OjekEngine"
        }
      });
      const a = res.data?.address || {};
      const nama = a.amenity || a.building || a.shop || a.road || "Lokasi";
      const kota = a.city || a.town || a.village || a.county || "";
      return `${nama}, ${kota}`.replace(/, $/, "");
    } catch {
      return `${lat},${lon}`;
    }
  }
  async cityBox(kota) {
    const res = await this.http.get(this.api.geo, {
      params: {
        q: kota,
        format: "json",
        limit: 1,
        featuretype: "city"
      },
      headers: {
        "User-Agent": "OjekEngine"
      }
    });
    const c = res.data?.[0];
    if (!c) throw new Error(`Kota ${kota} tidak ditemukan`);
    const b = c.boundingbox.map(Number);
    return {
      lat_min: b[0],
      lat_max: b[1],
      lon_min: b[2],
      lon_max: b[3]
    };
  }
  async run({
    spot,
    state,
    user_id
  }) {
    try {
      let s = this.dec(state) || {
        user_id: user_id || this.genId(),
        level: 1,
        xp: 0,
        balance: 5e4,
        total_trips: 0,
        active_trip: null,
        last_spot: spot || "Makassar"
      };
      if (spot) s.last_spot = spot;
      const kota = s.last_spot;
      const now = Date.now();
      if (s.active_trip) {
        const t = s.active_trip;
        const total = t.end_at - t.start_at;
        const sisaDet = Math.ceil((t.end_at - now) / 1e3);
        if (sisaDet > 0) {
          const prog = Math.min(99, Math.floor((now - t.start_at) / total * 100));
          const maps = this.buildMap(t.p_start, t.p_end, t.geometry, prog);
          const coords = this.decodePoly(t.geometry);
          const curIdx = Math.floor(prog / 100 * (coords.length - 1));
          const driverPos = coords[curIdx] || t.p_start;
          const locDriver = await this.locDetail(driverPos.lat, driverPos.lon);
          return {
            s: "perjalanan",
            uid: s.user_id,
            area: kota,
            msg: `🛵 Menuju ${t.dest_name}`,
            dr: this.drvInfo(s),
            loc: {
              pickup: await this.locDetail(t.p_start.lat, t.p_start.lon),
              drop: await this.locDetail(t.p_end.lat, t.p_end.lon),
              cur: locDriver
            },
            tm: {
              start: this.fmtTime(t.start_at),
              eta: this.fmtTime(t.end_at),
              left: `${Math.floor(sisaDet / 60)}m ${sisaDet % 60}s`
            },
            trip: {
              leftDist: (t.distance * (1 - prog / 100)).toFixed(2) + " km",
              prog: prog + "%"
            },
            map: maps,
            state: this.enc(s)
          };
        }
        const tip = Math.floor(Math.random() * 5e3) + 1e3;
        const earn = t.fare + tip;
        s.balance += earn;
        s.xp += Math.ceil(t.distance * 15);
        s.level = Math.floor(s.xp / 200) + 1;
        s.total_trips++;
        s.active_trip = null;
        const fmtRp = v => `Rp ${v.toLocaleString()}`;
        return {
          s: "selesai",
          uid: s.user_id,
          msg: `🏁 Selesai sampai di ${t.dest_name}`,
          dr: this.drvInfo(s),
          detail: {
            dist: t.distance + " km",
            dur: Math.ceil((t.end_at - t.start_at) / 6e4) + " menit",
            fare: fmtRp(t.fare),
            tip: fmtRp(tip),
            total: fmtRp(earn),
            saldo: fmtRp(s.balance)
          },
          loc: {
            from: await this.locDetail(t.p_start.lat, t.p_start.lon),
            to: await this.locDetail(t.p_end.lat, t.p_end.lon)
          },
          finish: this.fmtTime(now),
          tipMsg: `✨ Tip ${fmtRp(tip)} ✨`,
          state: this.enc(s)
        };
      }
      const box = await this.cityBox(kota);
      const cat = this.cats[Math.floor(Math.random() * this.cats.length)];
      const geoRes = await this.http.get(this.api.geo, {
        params: {
          q: `${cat}, ${kota}`,
          format: "json",
          limit: 15,
          bounded: 1,
          viewbox: `${box.lon_min},${box.lat_max},${box.lon_max},${box.lat_min}`,
          addressdetails: 1,
          "accept-language": "id"
        },
        headers: {
          "User-Agent": "OjekEngine"
        }
      });
      const locs = geoRes.data.filter(l => l.lat && l.lon);
      if (locs.length < 2) throw new Error("Lokasi tidak cukup");
      const shuffled = locs.sort(() => .5 - Math.random());
      const pStart = {
        lat: parseFloat(shuffled[0].lat),
        lon: parseFloat(shuffled[0].lon)
      };
      const pEnd = {
        lat: parseFloat(shuffled[1].lat),
        lon: parseFloat(shuffled[1].lon)
      };
      const routeRes = await this.http.get(`${this.api.route}/${pStart.lon},${pStart.lat};${pEnd.lon},${pEnd.lat}`, {
        params: {
          overview: "full",
          geometries: "polyline"
        }
      });
      const road = routeRes.data.routes[0];
      const [nameS, nameE] = await Promise.all([this.locDetail(pStart.lat, pStart.lon), this.locDetail(pEnd.lat, pEnd.lon)]);
      const km = parseFloat((road.distance / 1e3).toFixed(2));
      const dur = Math.ceil(road.duration);
      const fare = Math.max(12e3, Math.ceil(km * 4500));
      s.active_trip = {
        start_name: nameS,
        dest_name: nameE,
        distance: km,
        fare: fare,
        start_at: now,
        end_at: now + dur * 1e3,
        geometry: road.geometry,
        p_start: pStart,
        p_end: pEnd
      };
      const maps = this.buildMap(pStart, pEnd, road.geometry, 0);
      return {
        s: "dimulai",
        uid: s.user_id,
        area: kota,
        msg: `✅ Jemput di ${nameS}`,
        dr: this.drvInfo(s),
        trip: {
          pickup: nameS,
          drop: nameE,
          dist: km + " km",
          est: Math.ceil(dur / 60) + " menit",
          fare: `Rp ${fare.toLocaleString()}`
        },
        startTime: this.fmtTime(now),
        map: maps,
        state: this.enc(s)
      };
    } catch (err) {
      return {
        s: "error",
        msg: err.message,
        state: state
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new OjekEngine();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}