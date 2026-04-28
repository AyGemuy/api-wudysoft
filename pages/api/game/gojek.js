import axios from "axios";
class OjekEngine {
  constructor() {
    this.http = axios.create({
      timeout: 3e4
    });
    this.api = {
      route: "https://router.project-osrm.org/route/v1/driving",
      geo: "https://nominatim.openstreetmap.org/search",
      reverse: "https://nominatim.openstreetmap.org/reverse",
      yandex_info: "https://yandex.com/maps/api/location-info/get"
    };
    this.categories = ["cafe", "restaurant", "hospital", "school", "market", "mosque", "park"];
    this.badges = [{
      trips: 1,
      icon: "🛵",
      label: "Driver Baru"
    }, {
      trips: 5,
      icon: "⭐",
      label: "Driver Aktif"
    }, {
      trips: 10,
      icon: "🔥",
      label: "Driver Handal"
    }, {
      trips: 25,
      icon: "💎",
      label: "Driver Elite"
    }, {
      trips: 50,
      icon: "👑",
      label: "Driver Legendaris"
    }];
  }
  generate_user_id() {
    return "Ojek-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  encode(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  decode(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString()) : null;
    } catch {
      return null;
    }
  }
  decode_polyline_arr(str) {
    let index = 0,
      lat = 0,
      lng = 0,
      coords = [],
      shift = 0,
      result = 0,
      byte = null;
    try {
      while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;
        do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 31) << shift;
          shift += 5;
        } while (byte >= 32);
        lat += result & 1 ? ~(result >> 1) : result >> 1;
        byte = null;
        shift = 0;
        result = 0;
        do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 31) << shift;
          shift += 5;
        } while (byte >= 32);
        lng += result & 1 ? ~(result >> 1) : result >> 1;
        coords.push({
          lat: lat / 1e5,
          lon: lng / 1e5
        });
      }
    } catch {}
    return coords;
  }
  async get_city_bbox(kota) {
    try {
      const res = await this.http.get(this.api.geo, {
        params: {
          q: kota,
          format: "json",
          limit: 1,
          featuretype: "city",
          addressdetails: 1
        },
        headers: {
          "User-Agent": "OjekEngine-v6.9.3"
        }
      });
      const city = res.data?.[0];
      if (!city?.boundingbox) throw new Error(`Kota "${kota}" tidak ditemukan.`);
      const [lat_min, lat_max, lon_min, lon_max] = city.boundingbox.map(Number);
      return {
        lat_min: lat_min,
        lat_max: lat_max,
        lon_min: lon_min,
        lon_max: lon_max
      };
    } catch (err) {
      throw new Error(`Bbox Error: ${err.message}`);
    }
  }
  async search_in_city(kategori, kota, bbox) {
    try {
      const {
        lat_min,
        lat_max,
        lon_min,
        lon_max
      } = bbox;
      const viewbox = `${lon_min},${lat_max},${lon_max},${lat_min}`;
      const res = await this.http.get(this.api.geo, {
        params: {
          q: kategori ? `${kategori}, ${kota}` : kota,
          format: "json",
          limit: 20,
          bounded: 1,
          viewbox: viewbox,
          addressdetails: 1,
          "accept-language": "id"
        },
        headers: {
          "User-Agent": "OjekEngine-v6.9.3"
        }
      });
      return res.data.filter(l => l.osm_type !== "relation" && l.lat && l.lon);
    } catch {
      return [];
    }
  }
  async get_yandex_info(lat, lon) {
    try {
      const res = await this.http.get(this.api.yandex_info, {
        params: {
          ajax: 1,
          center: `${lon},${lat}`,
          lang: "id",
          zoom: 18
        },
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      return res.data?.data || null;
    } catch {
      return null;
    }
  }
  async reverse_geocode(lat, lon) {
    try {
      const [osmRes, yndxData] = await Promise.all([this.http.get(this.api.reverse, {
        params: {
          lat: lat,
          lon: lon,
          format: "json",
          addressdetails: 1,
          zoom: 18,
          "accept-language": "id"
        },
        headers: {
          "User-Agent": "OjekEngine-v6.9.3"
        }
      }).catch(() => ({
        data: {}
      })), this.get_yandex_info(lat, lon)]);
      const a = osmRes.data?.address || {};
      const y = yndxData || {};
      const nama_tempat = a.amenity || a.building || a.shop || a.office || a.leisure || a.tourism || y.title || "Titik Lokasi";
      const jalan = y.subtitle || (a.road ? `Jl. ${a.road}` : "-");
      const kelurahan_desa = a.village || a.neighbourhood || a.quarter || "-";
      const kecamatan = a.suburb || a.city_district || "-";
      const kota_kabupaten = a.city || a.town || a.county || a.municipality || "-";
      const provinsi = a.state || a.region || "-";
      const kode_pos = a.postcode || "-";
      const full_address = a.display_name || y.address || `${nama_tempat}, ${jalan}, ${kota_kabupaten}`;
      return {
        nama_tempat: nama_tempat,
        jalan: jalan,
        kelurahan_desa: kelurahan_desa,
        kecamatan: kecamatan,
        kota_kabupaten: kota_kabupaten,
        provinsi: provinsi,
        kode_pos: kode_pos,
        full_address: full_address,
        koordinat: `${lat}, ${lon}`
      };
    } catch {
      return {
        nama_tempat: "Lokasi Tidak Diketahui",
        jalan: "-",
        kelurahan_desa: "-",
        kecamatan: "-",
        kota_kabupaten: "-",
        provinsi: "-",
        kode_pos: "-",
        full_address: "-",
        koordinat: `${lat}, ${lon}`
      };
    }
  }
  format_alamat_singkat(geo) {
    const unik = [...new Set([geo.nama_tempat, geo.jalan, geo.kecamatan])].filter(i => i !== "-");
    return unik.length > 0 ? unik.join(", ") : "Titik Jemput/Tujuan";
  }
  async get_osrm_route(p_start, p_end) {
    try {
      const res = await this.http.get(`${this.api.route}/${p_start.lon},${p_start.lat};${p_end.lon},${p_end.lat}`, {
        params: {
          overview: "full",
          geometries: "polyline"
        }
      });
      const road = res.data.routes?.[0];
      if (!road) throw new Error("Jalan tidak bisa dihubungkan.");
      return road;
    } catch (err) {
      throw new Error(`OSRM Error: ${err.message}`);
    }
  }
  build_maps(p_start, p_end, encoded_polyline) {
    const sLat = parseFloat(p_start.lat),
      sLon = parseFloat(p_start.lon);
    const eLat = parseFloat(p_end.lat),
      eLon = parseFloat(p_end.lon);
    const coords_arr = this.decode_polyline_arr(encoded_polyline);
    const sample = coords_arr.filter((_, i) => i % 8 === 0);
    const yandex_path = sample.map(c => `${c.lon},${c.lat}`).join(",");
    const marker_start = `pm2blm`;
    const marker_end = `pm2rdm`;
    return {
      peta_jalan: `https://static-maps.yandex.ru/1.x/?l=map&size=650,450&pt=${sLon},${sLat},${marker_start}~${eLon},${eLat},${marker_end}&pl=c:0066FFCC,w:5,${yandex_path}&lang=id_ID`,
      peta_satelit: `https://static-maps.yandex.ru/1.x/?l=sat,skl&size=650,450&pt=${sLon},${sLat},${marker_start}~${eLon},${eLat},${marker_end}&pl=c:0066FFCC,w:5,${yandex_path}&lang=id_ID`,
      link_navigasi: `https://yandex.com/maps/?rtext=${sLat},${sLon}~${eLat},${eLon}&rtt=auto`
    };
  }
  get_badge(total_trips) {
    let badge = this.badges[0];
    for (const b of this.badges) {
      if (total_trips >= b.trips) badge = b;
    }
    return badge;
  }
  async run({
    spot,
    state,
    user_id
  }) {
    try {
      let s = this.decode(state) || {
        user_id: user_id || this.generate_user_id(),
        level: 1,
        xp: 0,
        balance: 5e4,
        total_trips: 0,
        active_trip: null
      };
      const now = Date.now();
      if (s.active_trip) {
        const t = s.active_trip;
        const sisa = Math.ceil((t.end_at - now) / 1e3);
        if (sisa > 0) {
          const progres = Math.min(99, Math.floor((now - t.start_at) / (t.end_at - t.start_at) * 100));
          return {
            status: "dalam_perjalanan",
            user_id: s.user_id,
            pesan: `🛵 Driver meluncur ke ${t.dest_name}`,
            sisa_waktu_detik: sisa,
            progres_persen: `${progres}%`,
            rute: {
              dari: t.start_name,
              ke: t.dest_name,
              jarak_km: t.distance,
              tarif: `Rp ${t.fare.toLocaleString("id-ID")}`
            },
            peta: t.maps,
            state: this.encode(s)
          };
        }
        const level_lama = s.level;
        const xp_gained = Math.ceil(t.distance * 12) + 10;
        const bonus_tip = Math.floor(Math.random() * 6e3);
        const total_bayar = t.fare + bonus_tip;
        s.balance += total_bayar;
        s.xp += xp_gained;
        s.level = Math.floor(s.xp / 150) + 1;
        s.total_trips = (s.total_trips || 0) + 1;
        s.active_trip = null;
        const badge = this.get_badge(s.total_trips);
        const xp_next = s.level * 150 - s.xp;
        return {
          status: "selesai",
          user_id: s.user_id,
          keterangan: "🏁 Trip selesai! Penumpang puas.",
          ringkasan_trip: {
            dari: t.start_name,
            ke: t.dest_name,
            jarak_km: t.distance,
            durasi_menit: Math.ceil((t.end_at - t.start_at) / 6e4)
          },
          pembayaran: {
            ongkos: `Rp ${t.fare.toLocaleString("id-ID")}`,
            tip: `Rp ${bonus_tip.toLocaleString("id-ID")}`,
            total: `Rp ${total_bayar.toLocaleString("id-ID")}`
          },
          rewards: {
            xp_didapat: `+${xp_gained} XP`,
            xp_total: s.xp,
            xp_ke_level: `${xp_next} XP lagi ke Level ${s.level + 1}`,
            level: s.level,
            level_naik: s.level > level_lama,
            badge: `${badge.icon} ${badge.label}`,
            total_trip: s.total_trips
          },
          saldo: {
            masuk: `+Rp ${total_bayar.toLocaleString("id-ID")}`,
            total: `Rp ${s.balance.toLocaleString("id-ID")}`
          },
          state: this.encode(s)
        };
      }
      const kota = spot || "Makassar";
      const bbox = await this.get_city_bbox(kota);
      const randCat = this.categories[Math.floor(Math.random() * this.categories.length)];
      let locs = await this.search_in_city(randCat, kota, bbox);
      if (locs.length < 2) locs = await this.search_in_city("place", kota, bbox);
      if (locs.length < 2) locs = await this.search_in_city("", kota, bbox);
      if (locs.length < 2) throw new Error(`Koordinat lokasi di ${kota} tidak memadai.`);
      const shuffled = locs.sort(() => .5 - Math.random());
      const p_start = shuffled[0];
      const p_end = shuffled[1];
      const road = await this.get_osrm_route(p_start, p_end);
      const [geo_start, geo_end] = await Promise.all([this.reverse_geocode(p_start.lat, p_start.lon), this.reverse_geocode(p_end.lat, p_end.lon)]);
      const maps = this.build_maps(p_start, p_end, road.geometry);
      const km = parseFloat((road.distance / 1e3).toFixed(2));
      const durasi = Math.ceil(road.duration);
      const ongkos = Math.max(12e3, Math.ceil(km * 4500));
      const ringkasan_start = this.format_alamat_singkat(geo_start);
      const ringkasan_end = this.format_alamat_singkat(geo_end);
      s.active_trip = {
        start_name: ringkasan_start,
        dest_name: ringkasan_end,
        distance: km,
        fare: ongkos,
        start_at: now,
        end_at: now + durasi * 1e3,
        maps: maps
      };
      const badge = this.get_badge(s.total_trips || 0);
      return {
        status: "dimulai",
        user_id: s.user_id,
        area: kota,
        pesanan: {
          jemput: ringkasan_start,
          jemput_detail: geo_start,
          tujuan: ringkasan_end,
          tujuan_detail: geo_end,
          jarak_km: km,
          tarif: `Rp ${ongkos.toLocaleString("id-ID")}`,
          estimasi_waktu: `${Math.ceil(durasi / 60)} menit`
        },
        peta: maps,
        profil_driver: {
          level: s.level,
          xp: s.xp,
          badge: `${badge.icon} ${badge.label}`,
          saldo: `Rp ${s.balance.toLocaleString("id-ID")}`,
          total_trip: s.total_trips || 0
        },
        state: this.encode(s)
      };
    } catch (err) {
      return {
        status: "error",
        pesan_sistem: err.message,
        state: state || null
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