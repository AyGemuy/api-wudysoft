import axios from "axios";
import AdmZip from "adm-zip";
class QuranMurattal {
  constructor(opts = {}) {
    try {
      this.cfgUrl = "https://api.quranformobile.com/remoteconfig/quranandroid/v1?success=true&appID=com.andi.alquran.id";
      this.srv = ["https://data.quranformobile.com/quranmurottal", "https://dataid.quranformobile.com/quranmurottal", "https://databackup.quranformobile.com/quranmurottal"];
      this.rec = {
        1: {
          id: 1,
          name: "Hani Ar-Rifai",
          path: "refai-64"
        },
        2: {
          id: 2,
          name: "Mishary Rashid Alafasy",
          path: "afasy-64"
        },
        3: {
          id: 3,
          name: "Fares Abbad",
          path: "fares-64"
        },
        4: {
          id: 4,
          name: "Mahmoud Khalil Al-Husary",
          path: "husary-64"
        },
        5: {
          id: 5,
          name: "Maher Al-Muaiqly",
          path: "muaiqly-64"
        },
        6: {
          id: 6,
          name: "Saad Al-Ghamdi",
          path: "ghamdi-40"
        },
        7: {
          id: 7,
          name: "Muhammad Jebril",
          path: "jebril-64"
        },
        8: {
          id: 8,
          name: "Abdurrahman As-Sudais",
          path: "sudais-64"
        }
      };
      this.sMeta = [{
        id: 1,
        name: "Al-Fatihah",
        ayas: 7
      }, {
        id: 2,
        name: "Al-Baqarah",
        ayas: 286
      }, {
        id: 3,
        name: "Ali 'Imran",
        ayas: 200
      }, {
        id: 4,
        name: "An-Nisa'",
        ayas: 176
      }, {
        id: 5,
        name: "Al-Ma'idah",
        ayas: 120
      }, {
        id: 6,
        name: "Al-An'am",
        ayas: 165
      }, {
        id: 7,
        name: "Al-A'raf",
        ayas: 206
      }, {
        id: 8,
        name: "Al-Anfal",
        ayas: 75
      }, {
        id: 9,
        name: "At-Taubah",
        ayas: 129
      }, {
        id: 10,
        name: "Yunus",
        ayas: 109
      }, {
        id: 11,
        name: "Hud",
        ayas: 123
      }, {
        id: 12,
        name: "Yusuf",
        ayas: 111
      }, {
        id: 13,
        name: "Ar-Ra'd",
        ayas: 43
      }, {
        id: 14,
        name: "Ibrahim",
        ayas: 52
      }, {
        id: 15,
        name: "Al-Hijr",
        ayas: 99
      }, {
        id: 16,
        name: "An-Nahl",
        ayas: 128
      }, {
        id: 17,
        name: "Al-Isra'",
        ayas: 111
      }, {
        id: 18,
        name: "Al-Kahf",
        ayas: 110
      }, {
        id: 19,
        name: "Maryam",
        ayas: 98
      }, {
        id: 20,
        name: "Ta Ha",
        ayas: 135
      }, {
        id: 21,
        name: "Al-Anbiya'",
        ayas: 112
      }, {
        id: 22,
        name: "Al-Hajj",
        ayas: 78
      }, {
        id: 23,
        name: "Al-Mu'minun",
        ayas: 118
      }, {
        id: 24,
        name: "An-Nur",
        ayas: 64
      }, {
        id: 25,
        name: "Al-Furqan",
        ayas: 77
      }, {
        id: 26,
        name: "Asy-Syu'ara'",
        ayas: 227
      }, {
        id: 27,
        name: "An-Naml",
        ayas: 93
      }, {
        id: 28,
        name: "Al-Qasas",
        ayas: 88
      }, {
        id: 29,
        name: "Al-'Ankabut",
        ayas: 69
      }, {
        id: 30,
        name: "Ar-Rum",
        ayas: 60
      }, {
        id: 31,
        name: "Luqman",
        ayas: 34
      }, {
        id: 32,
        name: "As-Sajdah",
        ayas: 30
      }, {
        id: 33,
        name: "Al-Ahzab",
        ayas: 73
      }, {
        id: 34,
        name: "Saba'",
        ayas: 54
      }, {
        id: 35,
        name: "Fatir",
        ayas: 45
      }, {
        id: 36,
        name: "Ya Sin",
        ayas: 83
      }, {
        id: 37,
        name: "As-Saffat",
        ayas: 182
      }, {
        id: 38,
        name: "Sad",
        ayas: 88
      }, {
        id: 39,
        name: "Az-Zumar",
        ayas: 75
      }, {
        id: 40,
        name: "Ghafir",
        ayas: 85
      }, {
        id: 41,
        name: "Fussilat",
        ayas: 54
      }, {
        id: 42,
        name: "Asy-Syura",
        ayas: 53
      }, {
        id: 43,
        name: "Az-Zukhruf",
        ayas: 89
      }, {
        id: 44,
        name: "Ad-Dukhan",
        ayas: 59
      }, {
        id: 45,
        name: "Al-Jasiyah",
        ayas: 37
      }, {
        id: 46,
        name: "Al-Ahqaf",
        ayas: 35
      }, {
        id: 47,
        name: "Muhammad",
        ayas: 38
      }, {
        id: 48,
        name: "Al-Fath",
        ayas: 29
      }, {
        id: 49,
        name: "Al-Hujurat",
        ayas: 18
      }, {
        id: 50,
        name: "Qaf",
        ayas: 45
      }, {
        id: 51,
        name: "Az-Zariyat",
        ayas: 60
      }, {
        id: 52,
        name: "At-Tur",
        ayas: 49
      }, {
        id: 53,
        name: "An-Najm",
        ayas: 62
      }, {
        id: 54,
        name: "Al-Qamar",
        ayas: 55
      }, {
        id: 55,
        name: "Ar-Rahman",
        ayas: 78
      }, {
        id: 56,
        name: "Al-Waqi'ah",
        ayas: 96
      }, {
        id: 57,
        name: "Al-Hadid",
        ayas: 29
      }, {
        id: 58,
        name: "Al-Mujadilah",
        ayas: 22
      }, {
        id: 59,
        name: "Al-Hasyr",
        ayas: 24
      }, {
        id: 60,
        name: "Al-Mumtahanah",
        ayas: 13
      }, {
        id: 61,
        name: "As-Saff",
        ayas: 14
      }, {
        id: 62,
        name: "Al-Jumu'ah",
        ayas: 11
      }, {
        id: 63,
        name: "Al-Munafiqun",
        ayas: 11
      }, {
        id: 64,
        name: "At-Tagabun",
        ayas: 18
      }, {
        id: 65,
        name: "At-Talaq",
        ayas: 12
      }, {
        id: 66,
        name: "At-Tahrim",
        ayas: 12
      }, {
        id: 67,
        name: "Al-Mulk",
        ayas: 30
      }, {
        id: 68,
        name: "Al-Qalam",
        ayas: 52
      }, {
        id: 69,
        name: "Al-Haqqah",
        ayas: 52
      }, {
        id: 70,
        name: "Al-Ma'arij",
        ayas: 44
      }, {
        id: 71,
        name: "Nuh",
        ayas: 28
      }, {
        id: 72,
        name: "Al-Jinn",
        ayas: 28
      }, {
        id: 73,
        name: "Al-Muzzammil",
        ayas: 20
      }, {
        id: 74,
        name: "Al-Muddassir",
        ayas: 56
      }, {
        id: 75,
        name: "Al-Qiyamah",
        ayas: 40
      }, {
        id: 76,
        name: "Al-Insan",
        ayas: 31
      }, {
        id: 77,
        name: "Al-Mursalat",
        ayas: 50
      }, {
        id: 78,
        name: "An-Naba'",
        ayas: 40
      }, {
        id: 79,
        name: "An-Nazi'at",
        ayas: 46
      }, {
        id: 80,
        name: "'Abasa",
        ayas: 42
      }, {
        id: 81,
        name: "At-Takwir",
        ayas: 29
      }, {
        id: 82,
        name: "Al-Infitar",
        ayas: 19
      }, {
        id: 83,
        name: "Al-Mutaffifin",
        ayas: 36
      }, {
        id: 84,
        name: "Al-Insyiqaq",
        ayas: 25
      }, {
        id: 85,
        name: "Al-Buruj",
        ayas: 22
      }, {
        id: 86,
        name: "At-Tariq",
        ayas: 17
      }, {
        id: 87,
        name: "Al-A'la",
        ayas: 19
      }, {
        id: 88,
        name: "Al-Ghasyiyah",
        ayas: 26
      }, {
        id: 89,
        name: "Al-Fajr",
        ayas: 30
      }, {
        id: 90,
        name: "Al-Balad",
        ayas: 20
      }, {
        id: 91,
        name: "Asy-Syams",
        ayas: 15
      }, {
        id: 92,
        name: "Al-Lail",
        ayas: 21
      }, {
        id: 93,
        name: "Ad-Duha",
        ayas: 11
      }, {
        id: 94,
        name: "Asy-Syarh",
        ayas: 8
      }, {
        id: 95,
        name: "At-Tin",
        ayas: 8
      }, {
        id: 96,
        name: "Al-'Alaq",
        ayas: 19
      }, {
        id: 97,
        name: "Al-Qadr",
        ayas: 5
      }, {
        id: 98,
        name: "Al-Bayyinah",
        ayas: 8
      }, {
        id: 99,
        name: "Az-Zalzalah",
        ayas: 8
      }, {
        id: 100,
        name: "Al-'Adiyat",
        ayas: 11
      }, {
        id: 101,
        name: "Al-Qari'ah",
        ayas: 11
      }, {
        id: 102,
        name: "At-Takasur",
        ayas: 8
      }, {
        id: 103,
        name: "Al-'Asr",
        ayas: 3
      }, {
        id: 104,
        name: "Al-Humazah",
        ayas: 9
      }, {
        id: 105,
        name: "Al-Fil",
        ayas: 5
      }, {
        id: 106,
        name: "Quraisy",
        ayas: 4
      }, {
        id: 107,
        name: "Al-Ma'un",
        ayas: 7
      }, {
        id: 108,
        name: "Al-Kausar",
        ayas: 3
      }, {
        id: 109,
        name: "Al-Kafirun",
        ayas: 6
      }, {
        id: 110,
        name: "An-Nasr",
        ayas: 3
      }, {
        id: 111,
        name: "Al-Lahab",
        ayas: 5
      }, {
        id: 112,
        name: "Al-Ikhlas",
        ayas: 4
      }, {
        id: 113,
        name: "Al-Falaq",
        ayas: 5
      }, {
        id: 114,
        name: "An-Nas",
        ayas: 6
      }];
      this.tmt = opts?.timeout || 15e3;
      this.isCfgLoaded = false;
    } catch (e) {
      console.log(`[INIT_ERROR] ${e?.message}`);
    }
  }
  pad(n) {
    try {
      return String(n || 0).padStart(3, "0");
    } catch {
      return "000";
    }
  }
  getRec(q) {
    try {
      if (!q) return this.rec[2];
      if (typeof q === "number" || !isNaN(q)) return this.rec?.[parseInt(q)] || null;
      const f = Object.values(this.rec).find(v => v?.name?.toLowerCase()?.includes(String(q)?.toLowerCase()));
      return f || null;
    } catch {
      return null;
    }
  }
  getSur(s) {
    try {
      if (!s) return null;
      if (typeof s === "number" || !isNaN(s)) {
        const n = parseInt(s);
        return this.sMeta.find(item => item.id === n) || null;
      }
      const clean = String(s).toLowerCase().replace(/[^a-z]/g, "");
      return this.sMeta.find(item => item.name.toLowerCase().replace(/[^a-z]/g, "").includes(clean)) || null;
    } catch {
      return null;
    }
  }
  findEnt(zip, targets) {
    try {
      const list = zip?.getEntries() || [];
      for (const e of list) {
        if (e?.isDirectory) continue;
        const fn = e?.entryName?.split("/")?.pop();
        if (targets.includes(fn)) return e;
      }
      return null;
    } catch {
      return null;
    }
  }
  async syncSrv() {
    if (this.isCfgLoaded) return this.srv;
    try {
      console.log("[PROCESS] Mengambil konfigurasi remote server...");
      const res = await axios.get(this.cfgUrl, {
        timeout: 5e3,
        headers: {
          "User-Agent": "okhttp/4.12.0"
        }
      });
      const d = res?.data;
      if (d?.server_satu || d?.server_dua || d?.server_tiga) {
        this.srv = [d?.server_satu || this.srv[0], d?.server_dua || this.srv[1], d?.server_tiga || this.srv[2]].filter(Boolean);
        this.isCfgLoaded = true;
        console.log(`[SUCCESS] Server sinkron: [${this.srv.join(", ")}]`);
      }
    } catch (e) {
      console.log(`[WARN] Gagal sinkronisasi remote config (${e?.message}), gunakan default.`);
    }
    return this.srv;
  }
  async resUrl(sub, fn) {
    await this.syncSrv();
    console.log(`[PROCESS] Validasi server aktif untuk: ${sub}/${fn}...`);
    for (const b of this.srv) {
      try {
        const u = `${b}/${sub}/${fn}`;
        const r = await axios.head(u, {
          timeout: 4e3,
          headers: {
            "User-Agent": "okhttp/4.12.0"
          }
        });
        if (r?.status === 200) {
          console.log(`[SUCCESS] Host valid: ${b}`);
          return u;
        }
      } catch {
        console.log(`[WARN] Host ${b} unreachable, coba mirror lain...`);
      }
    }
    return `${this.srv[0]}/${sub}/${fn}`;
  }
  async getBin(url) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: this.tmt,
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Cache-Control": "no-cache",
          "Accept-Encoding": "gzip"
        }
      });
      return Buffer.from(res?.data);
    } catch (e) {
      console.log(`[HTTP_ERROR] Download gagal dari ${url}: ${e?.message}`);
      throw e;
    }
  }
  async murattal({
    surah,
    ayat,
    qori,
    format = "url",
    extract = false,
    info = false,
    ...rest
  } = {}) {
    try {
      await this.syncSrv();
      const qoriList = Object.values(this.rec).map(q => ({
        qori_id: q?.id,
        qori_name: q?.name,
        folder_path: q?.path
      }));
      if (!surah && (!ayat || rest?.list)) {
        console.log("[PROCESS] Mengembalikan info Qari dan Surah yang tersedia...");
        return {
          status: true,
          result: {
            mode: "available_list",
            active_servers: this.srv,
            total_surah: 114,
            total_qori: qoriList.length,
            available_qori: qoriList,
            available_surah: this.sMeta.map(s => ({
              surah_number: s.id,
              surah_name: s.name,
              total_ayat: s.ayas
            }))
          }
        };
      }
      console.log(`[PROCESS] Validasi input surah: "${surah}"...`);
      const sObj = this.getSur(surah);
      if (!sObj) {
        console.log("[VALIDATION_FAIL] Surah tidak valid");
        return {
          status: false,
          result: {
            error_type: "INVALID_SURAH",
            error_message: `Surah '${surah}' tidak ditemukan. Masukkan nomor surah (1 - 114) atau nama surah valid.`,
            available_surah: this.sMeta.slice(0, 10).map(s => `${s.id}. ${s.name}`)
          }
        };
      }
      const sNum = sObj.id;
      console.log(`[VALIDATION_OK] Terdeteksi Surah ${sNum} (${sObj.name}) - Total Ayat: ${sObj.ayas}`);
      const qObj = this.getRec(qori);
      if (qori && !qObj) {
        console.log("[VALIDATION_FAIL] Qari tidak valid");
        return {
          status: false,
          result: {
            error_type: "INVALID_QORI",
            error_message: `Qari '${qori}' tidak dikenali.`,
            available_qori: qoriList
          }
        };
      }
      const q = qObj || this.rec[2];
      const aNum = ayat !== undefined && ayat !== null ? parseInt(ayat) : null;
      if (aNum !== null) {
        if (isNaN(aNum) || aNum < 0 || aNum > sObj.ayas) {
          console.log(`[VALIDATION_FAIL] Ayat ${aNum} di luar jangkauan`);
          return {
            status: false,
            result: {
              error_type: "INVALID_AYAT",
              error_message: `Ayat ${aNum} tidak valid untuk Surah ${sObj.name}.`,
              surah_number: sNum,
              surah_name: sObj.name,
              available_ayat_range: `1 - ${sObj.ayas}`
            }
          };
        }
      }
      if (info) {
        return {
          status: true,
          result: {
            mode: "surah_info",
            surah_number: sNum,
            surah_name: sObj.name,
            total_ayat: sObj.ayas,
            selected_qori: q.name,
            available_ayat: Array.from({
              length: sObj.ayas
            }, (_, i) => i + 1)
          }
        };
      }
      const zipName = `${this.pad(sNum)}.zip`;
      const remoteUrl = await this.resUrl(q?.path, zipName);
      if (format === "url" && aNum === null && !extract) {
        console.log(`[SUCCESS] Mengembalikan direct download URL surah ${sNum}`);
        return {
          status: true,
          result: {
            mode: "full_surah_zip",
            surah_number: sNum,
            surah_name: sObj.name,
            total_ayat: sObj.ayas,
            qori_name: q?.name,
            file_name: zipName,
            output_format: "url",
            data: remoteUrl
          }
        };
      }
      console.log(`[PROCESS] Mengunduh binary ZIP surah ${sNum}...`);
      const zipBuf = await this.getBin(remoteUrl);
      const zip = new AdmZip(zipBuf);
      if (aNum !== null) {
        console.log(`[PROCESS] Mencari audio Surah ${sNum} Ayat ${aNum}...`);
        const prefix = `${this.pad(sNum)}${this.pad(aNum)}`;
        const entry = this.findEnt(zip, [`${prefix}.mp3`, `${prefix}.dat`]);
        if (!entry) {
          throw new Error(`File ayat [${prefix}.mp3] tidak ditemukan di dalam arsip ZIP.`);
        }
        const audioBuf = entry.getData();
        let finalData = audioBuf;
        if (format === "b64") {
          finalData = audioBuf.toString("base64");
        } else if (format === "url") {
          finalData = `data:audio/mp3;base64,${audioBuf.toString("base64")}`;
        }
        console.log(`[SUCCESS] Audio ayat ${sNum}:${aNum} berhasil diproses`);
        return {
          status: true,
          result: {
            mode: "single_ayat",
            surah_number: sNum,
            surah_name: sObj.name,
            ayat_number: aNum,
            total_ayat_in_surah: sObj.ayas,
            qori_name: q?.name,
            file_name: `${prefix}.mp3`,
            mime_type: "audio/mpeg",
            size_bytes: audioBuf?.length || 0,
            output_format: format,
            data: finalData
          }
        };
      }
      if (extract) {
        console.log(`[PROCESS] Parsing in-memory seluruh ayat Surah ${sNum}...`);
        const ayats = [];
        const entries = zip.getEntries() || [];
        for (const e of entries) {
          const fn = e?.entryName?.split("/")?.pop() || "";
          if (!e.isDirectory && fn && fn !== "000_license.dat") {
            const rawBuf = e.getData();
            const mp3Name = fn.endsWith(".dat") ? fn.replace(".dat", ".mp3") : fn;
            let itemData = rawBuf;
            if (format === "b64") {
              itemData = rawBuf.toString("base64");
            } else if (format === "url") {
              itemData = `data:audio/mp3;base64,${rawBuf.toString("base64")}`;
            }
            ayats.push({
              file_name: mp3Name,
              size_bytes: rawBuf?.length || 0,
              data: itemData
            });
          }
        }
        console.log(`[SUCCESS] Selesai memproses ${ayats.length} ayat`);
        return {
          status: true,
          result: {
            mode: "extracted_surah",
            surah_number: sNum,
            surah_name: sObj.name,
            qori_name: q?.name,
            total_ayat: ayats.length,
            output_format: format,
            ayats: ayats
          }
        };
      }
      return {
        status: true,
        result: {
          mode: "full_surah_zip",
          surah_number: sNum,
          surah_name: sObj.name,
          qori_name: q?.name,
          file_name: zipName,
          size_bytes: zipBuf?.length || 0,
          output_format: format,
          data: format === "b64" ? zipBuf.toString("base64") : zipBuf
        }
      };
    } catch (err) {
      console.log(`[ERROR] Gagal: ${err?.message}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Unknown processing error"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["qori", "list", "info", "ayat", "surah", "extract"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          qori: "/?action=qori",
          list: "/?action=list",
          info: "/?action=info&surah=1",
          ayat: "/?action=ayat&surah=1&ayat=1&qori=alafasy&format=url",
          surah: "/?action=surah&surah=112&qori=sudais&format=url",
          extract: "/?action=extract&surah=114&qori=2&format=b64"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new QuranMurattal();
  try {
    let response;
    switch (action) {
      case "qori":
      case "list": {
        response = await api.murattal({
          list: true,
          ...params
        });
        break;
      }
      case "info": {
        const surah = params.surah || params.s;
        if (!surah) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'surah' wajib diisi untuk melihat info."
          });
        }
        response = await api.murattal({
          surah: surah,
          info: true,
          ...params
        });
        break;
      }
      case "ayat": {
        const surah = params.surah || params.s;
        const ayat = params.ayat || params.a;
        if (!surah || ayat === undefined || ayat === null) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'surah' dan 'ayat' wajib diisi untuk action 'ayat'."
          });
        }
        response = await api.murattal({
          surah: surah,
          ayat: ayat,
          qori: params.qori || params.q,
          format: params.format || "url",
          ...params
        });
        break;
      }
      case "surah": {
        const surah = params.surah || params.s;
        if (!surah) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'surah' wajib diisi untuk action 'surah'."
          });
        }
        response = await api.murattal({
          surah: surah,
          qori: params.qori || params.q,
          format: params.format || "url",
          extract: false,
          ...params
        });
        break;
      }
      case "extract": {
        const surah = params.surah || params.s;
        if (!surah) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'surah' wajib diisi untuk action 'extract'."
          });
        }
        response = await api.murattal({
          surah: surah,
          qori: params.qori || params.q,
          format: params.format || "url",
          extract: true,
          ...params
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (!response.status) {
      return res.status(400).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}