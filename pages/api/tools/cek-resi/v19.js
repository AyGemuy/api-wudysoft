import axios from "axios";
const FIS_URL = "https://firebaseinstallations.googleapis.com";
const FAC_URL = "https://firebaseappcheck.googleapis.com";
const PROJECT = "lacak-paket-007";
class ResikuBypass {
  constructor() {
    this.api = "https://api.resiku.com";
    this.key = "AIzaSyBK0xA3AvVhxvEVaVUibS53U6coo-bMMOQ";
    this.appId = "1:943689063768:android:cbbfc342f51c38f4f1992d";
    this.dbg = "573FE39E-DF51-4ABB-A396-D9EC5E582DF9";
    this.map = {
      spx: "Shopee Express",
      jne: "JNE Express",
      "jne-phone": "JNE (Phone)",
      jnt: "J&T Express",
      "jnt-cargo": "J&T Cargo",
      sicepat: "SiCepat",
      anteraja: "Anteraja",
      ninja: "Ninja Xpress",
      lion: "Lion Parcel",
      pos: "POS Indonesia",
      tiki: "TIKI",
      wahana: "Wahana"
    };
    this.hds = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      "X-Android-Package": "com.lacakpaket.app",
      "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    console.log("ResikuBypass class initialized");
  }
  expedisiList() {
    console.log("Fetching expedisi list");
    try {
      const list = Object.entries(this.map).map(([code, name]) => ({
        code: code,
        name: name
      }));
      console.log(`Expedisi list loaded: ${list.length} carriers`);
      return {
        success: true,
        data: list,
        count: list.length
      };
    } catch (err) {
      console.error("Expedisi list error:", err?.message || "Unknown error");
      return {
        success: false,
        error: err?.message || "Failed to load expedisi list",
        data: []
      };
    }
  }
  async trackResi({
    resi,
    expedisi,
    ...rest
  }) {
    console.log(`Tracking resi: ${resi}, expedisi: ${expedisi}`);
    try {
      if (!resi) return {
        success: false,
        error: "Nomor resi wajib diisi!",
        resi: resi,
        expedisi: expedisi
      };
      if (!expedisi) return {
        success: false,
        error: "Kurir/Ekspedisi wajib diisi!",
        resi: resi,
        expedisi: expedisi
      };
      const cleanWb = resi.replace(/\s+/g, "").trim();
      const code = expedisi.toLowerCase();
      if (cleanWb.length < 5) return {
        success: false,
        error: "Nomor resi terlalu pendek!",
        resi: resi,
        expedisi: expedisi
      };
      if (!this.map[code]) return {
        success: false,
        error: `Ekspedisi "${expedisi}" belum didukung!`,
        resi: resi,
        expedisi: expedisi
      };
      console.log("Mengautentikasi Firebase Installation (FIS)...");
      const resFis = await axios.post(`${FIS_URL}/v1/projects/${PROJECT}/installations`, {
        fid: "cVDL7Rj2TpWUfIb43r7OLN",
        appId: this.appId,
        authVersion: "FIS_v2",
        sdkVersion: "a:19.0.1"
      }, {
        headers: {
          ...this.hds,
          "x-goog-api-key": this.key
        }
      });
      const fisToken = resFis.data?.authToken?.token;
      if (!fisToken) throw new Error("FIS Auth Token tidak ditemukan di response.");
      console.log("FIS Token berhasil didapatkan.");
      console.log("Menukarkan token ke Firebase App Check...");
      const resApp = await axios.post(`${FAC_URL}/v1/projects/${PROJECT}/apps/${this.appId}:exchangeDebugToken`, {
        debugToken: this.dbg
      }, {
        params: {
          key: this.key
        },
        headers: {
          ...this.hds,
          Authorization: `Firebase ${fisToken}`
        }
      });
      const appCheckToken = resApp.data?.token;
      if (!appCheckToken) throw new Error("App Check Token kosong.");
      console.log("App Check Token valid siap digunakan.");
      console.log(`Mengirim request tracking untuk [${this.map[code]}]...`);
      const resTrack = await axios.post(`${this.api}/tracking`, {
        wb_number: cleanWb,
        courier: code,
        uuid: "3c0a4e8d-88f1-4ab4-9fa2-8cb14ef82121",
        ...rest
      }, {
        headers: {
          ...this.hds,
          "X-Firebase-AppCheck": appCheckToken
        }
      });
      const raw = resTrack.data;
      if (!raw || raw.status !== 1) {
        console.warn("Server merespon namun data tidak ditemukan.");
        return {
          success: false,
          error: raw?.message || "Data resi tidak ditemukan.",
          resi: resi,
          expedisi: expedisi
        };
      }
      console.log(`Tracking response received: ${Object.keys(raw).length} properties`);
      const det = raw.details;
      const manifests = raw.manifest || [];
      return {
        success: true,
        expedisi: code,
        resi: cleanWb,
        server: raw.server || "unknown",
        courier: {
          code: code,
          name: det.courier || this.map[code],
          iconUrl: `${this.api}/public/images/couriers/${code}.webp`
        },
        details: {
          ...det,
          isDelivered: det.status === "DELIVERED",
          uiIcon: det.status === "DELIVERED" ? "checkmark-circle" : "time",
          uiColor: det.status === "DELIVERED" ? "green" : "orange",
          lastTrack: manifests[0]?.description || "-"
        },
        manifest: manifests.map(m => ({
          ...m
        }))
      };
    } catch (err) {
      console.error("Tracking error:", err?.message || "Unknown error");
      return {
        success: false,
        error: err?.response?.data || err?.message || "Tracking failed",
        expedisi: expedisi,
        resi: resi
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new ResikuBypass();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        if (!params.expedisi) {
          data = await api.expedisiList();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.trackResi(params);
        return res.status(200).json(data);
      case "list":
        data = api.expedisiList();
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "list"]
        });
    }
  } catch (err) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}