import fetch from "node-fetch";
import crypto from "crypto";
class AnimeKita {
  constructor() {
    try {
      this.conf = {
        base: "https://apps.animekita.org/api/v1.2.5",
        base_pay: "https://pay.animekita.org",
        base_all: "https://apps.animekita.org/api/allVersions",
        ep: {
          login: "/model/login.php",
          pin: "/model/getpin.php",
          nobar: "/model/getnobar.php",
          jadwal: "/jadwal.php",
          data: "/baruupload.php",
          movie: "/movie.php",
          ongoing: "/home/ongoing.php",
          recom: "/rekomendasi.php",
          riwayat: "/model/getriwayat.php",
          search: "/search.php",
          series: "/series.php",
          series_id: "/seriesSimple.php",
          genre: "/genreseries.php",
          eps: "/series/episode/data.php",
          sub_pin: "/model/pin.php",
          chap: "/chapter.php",
          list: "/anime-list.php",
          user_details: "/users/details.php",
          user_complex: "/users/detailsComplex.php",
          user_edit: "/users/edit.php",
          leaderboard: "/model/leaderboard.php",
          set_history: "/model/sethistory.php",
          balasan_series: "/balasan-series.php",
          pub_chat: "/model/chat/getPublicChat.php",
          pub_chat_ticky: "/model/chat/getPublicChatTicky.php",
          add_pub_chat: "/model/chat/addPublicChat.php",
          nobar_chat: "/model/chat/getNobarChat.php",
          add_nobar_chat: "/model/chat/addNobarChat.php",
          room_data: "/model/getRoomData.php",
          room_member: "/model/getRoomMember.php",
          join_room: "/model/joinRoom.php",
          leave_room: "/model/leaveRoom.php",
          set_room_data: "/model/setRoomData.php",
          set_room_eps: "/model/setRoomEpisode.php",
          nobar_room: "/model/nobar.php",
          comments: "/model/komentar.php",
          comments_filter: "/model/getkomentar.php",
          replies: "/model/getbalasan.php",
          comment_total: "/series/episode/komentar/checkTotal.php",
          comment_bg: "/model/setBackgroundKomentar.php",
          likes: "/series/episode/likes/getLikes.php",
          like_dislike: "/model/likedislike.php",
          pins: "/model/users/pin/pin.php",
          pin_categories: "/model/users/pin/pin_category.php",
          pin_list: "/model/users/pin/pin_list.php",
          pin_overview: "/model/users/pin/pin_overview.php",
          notif: "/model/getNotifikasi.php",
          app_config: "/model/app-config.php",
          report: "/model/report/laporanOtomatis.php"
        },
        hdrs: {
          Accept: "application/json",
          "Access-Control-Allow-Origin": "*",
          "User-Agent": "Animekita-Android-App/1.2.5"
        },
        f_hdrs: {
          "User-Agent": "Flutter/2.5.3",
          Accept: "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      };
      this.sess = {
        token: null,
        user: null,
        profile: null,
        attempts: 0,
        max: 3
      };
      this.creds = this._cryptCreds();
      this._log("INIT", "Client siap", {
        user: this.creds.user
      });
    } catch (err) {
      console.error("[Fatal Error Init]", err.message);
    }
  }
  _cryptCreds() {
    try {
      const r_hex = crypto.randomBytes(4).toString("hex");
      const first = ["Rin", "Kai", "Mio", "Yuki", "Sora"][crypto.randomInt(0, 5)];
      const last = ["Sato", "Ito", "Kato", "Saito", "Yama"][crypto.randomInt(0, 5)];
      const domains = ["gmail.com", "proton.me", "outlook.com"];
      const domain = domains[crypto.randomInt(0, domains.length)];
      return {
        user: `${first}_${last}_${r_hex}`,
        email: `${first.toLowerCase()}.${r_hex}@${domain}`,
        profil: `https://i.pravatar.cc/150?u=${r_hex}`
      };
    } catch (err) {
      this._log("ERROR", "Gagal generate crypto creds", {
        err: err.message
      });
      return {
        user: "guest",
        email: "guest@gmail.com",
        profil: ""
      };
    }
  }
  _log(cat, msg, data = null) {
    const time = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Makassar"
    });
    console.log(`[${time} WITA] [${cat}] ${msg}`, data ? JSON.stringify(data) : "");
  }
  async _auth() {
    try {
      if (this.sess.token) return true;
      if (this.sess.attempts >= this.sess.max) {
        this._log("ERROR", "Batas maksimal percobaan login tercapai");
        return false;
      }
      this.sess.attempts++;
      this._log("AUTH", `Mencoba auto login ke-${this.sess.attempts}`);
      const res = await this._doLogin();
      if (res && res.status === 1 && res.token) {
        this.sess.token = res.token;
        this.sess.user = res.user;
        this.sess.profile = res.profile;
        this.sess.attempts = 0;
        this._log("AUTH", "Login sukses", {
          user: res.user
        });
        return true;
      }
      this._log("ERROR", "Auto login gagal ditolak oleh server");
      return false;
    } catch (err) {
      this._log("ERROR", "Auth Exception", {
        err: err.message
      });
      return false;
    }
  }
  async _doLogin(custom = null) {
    try {
      const data = custom || this.creds;
      const url = `${this.conf.base}${this.conf.ep.login}`;
      this._log("LOGIN", "Mengirim payload kredensial ke server...");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.9 (dart:io)",
          "Content-Type": "text/plain; charset=utf-8",
          Accept: "application/json"
        },
        body: JSON.stringify(data)
      });
      const txt = await res.text();
      const json = JSON.parse(txt);
      return json.data?.[0] || json;
    } catch (err) {
      this._log("ERROR", "Gagal mengeksekusi _doLogin", {
        err: err.message
      });
      return {
        status: 0,
        error: err.message
      };
    }
  }
  async _req(ep, opts = {}) {
    try {
      if (opts.requiresAuth && !await this._auth()) {
        return {
          error: true,
          message: "Authentication failed. Token unable to generate."
        };
      }
      const path = this.conf.ep[ep] || ep;
      let baseUrl = this.conf.base;
      if (opts.usePayBase) baseUrl = this.conf.base_pay;
      if (opts.useAllBase) baseUrl = this.conf.base_all;
      let url = `${baseUrl}${path}`;
      if (opts.query) {
        url = `${url}?${new URLSearchParams(opts.query).toString()}`;
      }
      const hdrs = {
        ...this.conf.hdrs,
        ...ep === "chap" ? this.conf.f_hdrs : {},
        ...opts.customHeaders
      };
      let body = null;
      if (opts.body) {
        const bData = {
          ...opts.body
        };
        if (opts.requiresAuth && this.sess.token) bData.token = this.sess.token;
        body = JSON.stringify(bData);
        hdrs["Content-Type"] = ep === "chap" ? "text/plain; charset=utf-8" : "application/json";
      }
      this._log("REQ", `${opts.method || "GET"} -> ${url.split("?")[0]}`);
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: hdrs,
        body: body
      });
      const txt = await res.text();
      if (res.status >= 200 && res.status < 300) {
        const json = JSON.parse(txt);
        this._log("RES", `Sukses [${res.status}] dari endpoint: ${ep}`);
        return json?.data || json;
      }
      if ((res.status === 401 || res.status === 403) && opts.requiresAuth && !opts._retried) {
        this._log("AUTH", "Token kedaluwarsa atau invalid, menghapus sesi lama & mencoba re-auth...");
        this.sess.token = null;
        return await this._req(ep, {
          ...opts,
          _retried: true
        });
      }
      this._log("ERROR", `Server merespon HTTP ${res.status}`, {
        detail: txt.slice(0, 150)
      });
      return {
        error: `HTTP ${res.status}`,
        message: txt
      };
    } catch (err) {
      this._log("ERROR", `Exception fatal pada request _req di endpoint: ${ep}`, {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async jadwal() {
    try {
      this._log("PROSES", "Mengambil data jadwal rilis anime...");
      return await this._req("jadwal", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method jadwal()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async data(payload = {}) {
    try {
      const {
        page = 1, ...rest
      } = payload;
      this._log("PROSES", `Mengambil data upload terbaru, Halaman: ${page}`);
      return await this._req("data", {
        method: "GET",
        query: {
          page: page,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method data()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async movie() {
    try {
      this._log("PROSES", "Mengambil seluruh daftar film/movies...");
      return await this._req("movie", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method movie()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async ongoing(payload = {}) {
    try {
      const {
        type,
        page = 1,
        ...rest
      } = payload;
      if (!type) {
        this._log("VALIDASI", "Tipe ongoing kosong");
        return {
          error: true,
          message: "Param 'type' required"
        };
      }
      this._log("PROSES", `Mengambil anime ongoing tipe: ${type}, Halaman: ${page}`);
      return await this._req("ongoing", {
        method: "GET",
        query: {
          page: page,
          type: type,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method ongoing()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async recom() {
    try {
      this._log("PROSES", "Mengambil data rekomendasi anime...");
      return await this._req("recom", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method recom()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async search(payload = {}) {
    try {
      const {
        keyword,
        page = 1,
        per_page = 40,
        ...rest
      } = payload;
      if (!keyword) {
        this._log("VALIDASI", "Keyword pencarian kosong");
        return {
          error: true,
          message: "Param 'keyword' required"
        };
      }
      this._log("PROSES", `Mencari konten dengan kata kunci: "${keyword}"`);
      return await this._req("search", {
        method: "GET",
        query: {
          keyword: encodeURIComponent(keyword),
          page: page,
          per_page: per_page,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method search()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async rel_search(payload = {}) {
    try {
      const {
        series_name,
        ...rest
      } = payload;
      if (!series_name) {
        this._log("VALIDASI", "Nama series untuk related search kosong");
        return {
          error: true,
          message: "Param 'series_name' required"
        };
      }
      this._log("PROSES", `Memproses related search untuk: "${series_name}"`);
      return await this.search({
        keyword: series_name.replace(/ Season.*/, ""),
        ...rest
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method rel_search()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async list() {
    try {
      this._log("PROSES", "Mengunduh seluruh indeks katalog anime list...");
      return await this._req("list", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method list()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async genre(payload = {}) {
    try {
      const {
        page = 1, ...rest
      } = payload;
      this._log("PROSES", `Mengambil daftar genre series halaman: ${page}`);
      return await this._req("genre", {
        method: "GET",
        query: {
          page: page,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method genre()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async series(payload = {}) {
    try {
      const {
        url,
        ...rest
      } = payload;
      if (!url) {
        this._log("VALIDASI", "URL series kosong");
        return {
          error: true,
          message: "Param 'url' required"
        };
      }
      this._log("PROSES", `Mengambil metadata rincian series berdasarkan Slug/URL: ${url}`);
      return await this._req("series", {
        method: "GET",
        query: {
          url: url,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method series()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async series_id(payload = {}) {
    try {
      const {
        id,
        ...rest
      } = payload;
      if (!id) {
        this._log("VALIDASI", "ID series kosong");
        return {
          error: true,
          message: "Param 'id' required"
        };
      }
      this._log("PROSES", `Mengambil info ringkas untuk ID Series: ${id}`);
      return await this._req("series_id", {
        method: "GET",
        query: {
          id: id,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method series_id()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async eps(payload = {}) {
    try {
      const {
        url,
        ...rest
      } = payload;
      if (!url) {
        this._log("VALIDASI", "URL episode kosong");
        return {
          error: true,
          message: "Param 'url' required"
        };
      }
      this._log("PROSES", `Mengambil data stream & download video episode: ${url}`);
      return await this._req("eps", {
        method: "GET",
        query: {
          url: url,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method eps()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async chap(payload = {}) {
    try {
      const {
        url,
        ...rest
      } = payload;
      if (!url) {
        this._log("VALIDASI", "URL chapter kosong");
        return {
          error: true,
          message: "Param 'url' required"
        };
      }
      this._log("PROSES", `Mengambil data bacaan komik chapter: ${url}`);
      return await this._req("chap", {
        method: "GET",
        query: {
          url: url,
          ...rest
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method chap()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async login(payload = {}) {
    try {
      const {
        user,
        email,
        ...rest
      } = payload;
      this._log("PROSES", "Menjalankan modul login manual...");
      if (user && email) this.creds = {
        ...this.creds,
        user: user,
        email: email,
        ...rest
      };
      const res = await this._doLogin(user && email ? this.creds : null);
      if (res && res.status === 1 && res.token) {
        this.sess.token = res.token;
        this.sess.user = res.user;
        this.sess.profile = res.profile;
        this.sess.attempts = 0;
      }
      return res;
    } catch (err) {
      this._log("ERROR", "Gagal di method login()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pin(payload = {}) {
    try {
      const {
        type = "all", ...rest
      } = payload;
      this._log("PROSES", `Mengambil data pin terbaru tipe: ${type}`);
      return await this._req("pin", {
        method: "POST",
        body: {
          action: "getnew",
          type: type,
          ...rest
        },
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pin()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async nobar(payload = {}) {
    try {
      const {
        type = "all", ...rest
      } = payload;
      this._log("PROSES", `Mengambil jadwal nonton bareng tipe: ${type}`);
      return await this._req("nobar", {
        method: "POST",
        body: {
          action: "getnew",
          type: type,
          ...rest
        },
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method nobar()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async riwayat() {
    try {
      this._log("PROSES", "Mengambil riwayat tontonan user dari server...");
      return await this._req("riwayat", {
        method: "POST",
        body: {},
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method riwayat()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async sub_pin(payload = {}) {
    try {
      const {
        action = "",
          type = "1",
          series_id,
          url,
          series_url_path, ...rest
      } = payload;
      if (!series_id) {
        this._log("VALIDASI", "Series ID wajib diisi untuk kirim PIN");
        return {
          error: true,
          message: "Param 'series_id' required"
        };
      }
      this._log("PROSES", `Melakukan submit PIN untuk ID Series: ${series_id}`);
      return await this._req("sub_pin", {
        method: "POST",
        body: {
          action: action,
          type: type,
          series_id: series_id,
          url: series_url_path || url || "",
          ...rest
        },
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method sub_pin()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async user_details() {
    try {
      this._log("PROSES", "Mengambil rincian profil user login...");
      return await this._req("user_details", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method user_details()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async user_complex(payload = {}) {
    try {
      const {
        get = "overview"
      } = payload;
      this._log("PROSES", `Mengambil user data complex tipe: ${get}`);
      return await this._req("user_complex", {
        method: "GET",
        query: {
          get: get
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method user_complex()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async leaderboard() {
    try {
      this._log("PROSES", "Mengambil data peringkat kontribusi leaderboard...");
      return await this._req("leaderboard", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method leaderboard()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async balasan_series() {
    try {
      this._log("PROSES", "Mengambil daftar balasan/notifikasi series...");
      return await this._req("balasan_series", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method balasan_series()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async notif() {
    try {
      this._log("PROSES", "Mengambil notifikasi masuk...");
      return await this._req("notif", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method notif()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async app_config() {
    try {
      this._log("PROSES", "Mengambil konfigurasi internal aplikasi...");
      return await this._req("app-config", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method app_config()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async set_history(payload = {}) {
    try {
      this._log("PROSES", "Menyimpan data riwayat tontonan baru ke server...");
      return await this._req("set_history", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method set_history()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pub_chat() {
    try {
      this._log("PROSES", "Membaca data chat room publik...");
      return await this._req("pub_chat", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pub_chat()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pub_chat_ticky() {
    try {
      this._log("PROSES", "Membaca chat publik bertanda khusus / ticky...");
      return await this._req("pub_chat_ticky", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pub_chat_ticky()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async add_pub_chat(payload = {}) {
    try {
      this._log("PROSES", "Mengirim pesan baru ke chat room publik...");
      return await this._req("add_pub_chat", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method add_pub_chat()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async nobar_chat(payload = {}) {
    try {
      const {
        room_id,
        type = 1
      } = payload;
      this._log("PROSES", `Mengambil chat room nobar ID: ${room_id}`);
      return await this._req("nobar_chat", {
        method: "GET",
        query: {
          room_id: room_id,
          type: type
        }
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method nobar_chat()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async add_nobar_chat(payload = {}) {
    try {
      this._log("PROSES", `Mengirim pesan baru ke room nobar ID: ${payload.room_id}`);
      return await this._req("add_nobar_chat", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method add_nobar_chat()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async room_data(payload = {}) {
    try {
      this._log("PROSES", `Mengambil informasi data room ID: ${payload.room_id}`);
      return await this._req("room_data", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method room_data()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async room_member(payload = {}) {
    try {
      this._log("PROSES", `Mengambil daftar anggota room ID: ${payload.room_id}`);
      return await this._req("room_member", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method room_member()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async join_room(payload = {}) {
    try {
      this._log("PROSES", `Memproses permintaan bergabung ke room ID: ${payload.room_id}`);
      return await this._req("join_room", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method join_room()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async leave_room(payload = {}) {
    try {
      this._log("PROSES", `Keluar dari room ID: ${payload.room_id}`);
      return await this._req("leave_room", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method leave_room()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async set_room_data(payload = {}) {
    try {
      this._log("PROSES", `Memperbarui konfigurasi utama room ID: ${payload.room_id}`);
      return await this._req("set_room_data", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method set_room_data()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async set_room_eps(payload = {}) {
    try {
      this._log("PROSES", `Mengubah set penayangan episode untuk room ID: ${payload.room_id}`);
      return await this._req("set_room_eps", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method set_room_eps()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async nobar_room() {
    try {
      this._log("PROSES", "Mengambil index daftar seluruh room nobar aktif...");
      return await this._req("nobar_room", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method nobar_room()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async comments(payload = {}) {
    try {
      if (payload.message) {
        this._log("PROSES", "Mengirim data komentar baru...");
        return await this._req("comments", {
          method: "POST",
          body: payload,
          requiresAuth: true
        });
      }
      this._log("PROSES", "Mengambil list data komentar...");
      return await this._req("comments", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method comments()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async comments_filter(payload = {}) {
    try {
      this._log("PROSES", "Mengambil data komentar terfilter...");
      return await this._req("comments_filter", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method comments_filter()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async replies(payload = {}) {
    try {
      this._log("PROSES", "Mengambil data balasan komentar...");
      return await this._req("replies", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method replies()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async comment_total(payload = {}) {
    try {
      this._log("PROSES", `Menghitung total kuantitas komentar dari Post ID: ${payload.post_id}`);
      return await this._req("comment_total", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method comment_total()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async comment_bg(payload = {}) {
    try {
      this._log("PROSES", "Mengatur custom latar belakang dekorasi komentar...");
      return await this._req("comment_bg", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method comment_bg()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async likes(payload = {}) {
    try {
      this._log("PROSES", `Mengambil metrik jumlah suka dari Episode ID: ${payload.episode_id}`);
      return await this._req("likes", {
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method likes()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async like_dislike(payload = {}) {
    try {
      this._log("PROSES", `Mengirim sinyal Like/Dislike untuk Post ID: ${payload.post_id}`);
      return await this._req("like_dislike", {
        method: "POST",
        body: payload,
        requiresAuth: true
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method like_dislike()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pins() {
    try {
      this._log("PROSES", "Mengambil data pin utama...");
      return await this._req("pins", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pins()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pin_categories() {
    try {
      this._log("PROSES", "Mengambil pembagian kategori pin list...");
      return await this._req("pin_categories", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pin_categories()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pin_list() {
    try {
      this._log("PROSES", "Mengunduh daftar deretan data pin...");
      return await this._req("pin_list", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pin_list()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async pin_overview() {
    try {
      this._log("PROSES", "Mengambil rangkuman / data overview pin...");
      return await this._req("pin_overview", {
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method pin_overview()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async report(payload = {}) {
    try {
      this._log("PROSES", "Mengirimkan formulir laporan otomatis crash / error...");
      return await this._req("report", {
        method: "POST",
        body: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method report()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async get_prices() {
    try {
      this._log("PROSES", "Mengambil katalog harga paket langganan premium...");
      return await this._req("/payment/price.php", {
        useAllBase: true,
        method: "GET"
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method get_prices()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  async check_invoice(payload = {}) {
    try {
      this._log("PROSES", `Memverifikasi data status invoice referensi: ${payload.ref}`);
      return await this._req("/checkInvoice.php", {
        usePayBase: true,
        method: "GET",
        query: payload
      });
    } catch (err) {
      this._log("ERROR", "Gagal di method check_invoice()", {
        err: err.message
      });
      return {
        error: err.message
      };
    }
  }
  get_token() {
    return this.sess.token;
  }
  is_logged() {
    return !!this.sess.token;
  }
  get_user() {
    return {
      user: this.sess.user,
      profile: this.sess.profile
    };
  }
  get_creds() {
    return {
      ...this.creds
    };
  }
  logout() {
    try {
      this.sess.token = null;
      this.sess.user = null;
      this.sess.profile = null;
      this.sess.attempts = 0;
      this._log("LOGOUT", "Sesi login berhasil dibersihkan.");
    } catch (err) {
      this._log("ERROR", "Gagal menjalankan logout()", {
        err: err.message
      });
    }
  }
  regen_creds() {
    try {
      this._log("CRED", "Memperbarui kredensial acak baru...");
      this.creds = this._cryptCreds();
      this.logout();
    } catch (err) {
      this._log("ERROR", "Gagal melakukan regenerasi kredensial", {
        err: err.message
      });
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["jadwal", "data", "movie", "ongoing", "recom", "search", "rel_search", "list", "genre", "series", "series_id", "eps", "chap", "pin", "nobar", "riwayat", "sub_pin", "login", "logout", "status", "regen", "user_details", "user_complex", "leaderboard", "balasan_series", "notif", "app_config", "set_history", "pub_chat", "pub_chat_ticky", "add_pub_chat", "nobar_chat", "add_nobar_chat", "room_data", "room_member", "join_room", "leave_room", "set_room_data", "set_room_eps", "nobar_room", "comments", "comments_filter", "replies", "comment_total", "comment_bg", "likes", "like_dislike", "pins", "pin_categories", "pin_list", "pin_overview", "report", "prices", "check_invoice"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          jadwal: "/?action=jadwal",
          search: "/?action=search&keyword=naruto",
          series: "/?action=series&url=slug-anime-url"
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
  const api = new AnimeKita();
  try {
    let response;
    switch (action) {
      case "jadwal":
        response = await api.jadwal();
        break;
      case "data":
        response = await api.data(params);
        break;
      case "movie":
        response = await api.movie();
        break;
      case "ongoing":
        if (!params.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' wajib diisi untuk action 'ongoing'.",
            example: "/?action=ongoing&type=anime"
          });
        }
        response = await api.ongoing(params);
        break;
      case "recom":
        response = await api.recom();
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk action 'search'.",
            example: "/?action=search&keyword=naruto"
          });
        }
        response = await api.search(params);
        break;
      case "rel_search":
        if (!params.series_name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_name' wajib diisi untuk action 'rel_search'.",
            example: "/?action=rel_search&series_name=boruto"
          });
        }
        response = await api.rel_search(params);
        break;
      case "list":
        response = await api.list();
        break;
      case "genre":
        response = await api.genre(params);
        break;
      case "series":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'series'.",
            example: "/?action=series&url=slug-anime-url"
          });
        }
        response = await api.series(params);
        break;
      case "series_id":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'series_id'.",
            example: "/?action=series_id&id=1234"
          });
        }
        response = await api.series_id(params);
        break;
      case "eps":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'eps'.",
            example: "/?action=eps&url=slug-episode-url"
          });
        }
        response = await api.eps(params);
        break;
      case "chap":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'chap'.",
            example: "/?action=chap&url=slug-chapter-url"
          });
        }
        response = await api.chap(params);
        break;
      case "pin":
        response = await api.pin(params);
        break;
      case "nobar":
        response = await api.nobar(params);
        break;
      case "riwayat":
        response = await api.riwayat();
        break;
      case "sub_pin":
        if (!params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'series_id' wajib diisi untuk action 'sub_pin'.",
            example: "/?action=sub_pin&series_id=1234&pinAction=add"
          });
        }
        response = await api.sub_pin(params);
        break;
      case "login":
        response = await api.login(params);
        break;
      case "logout":
        api.logout();
        response = {
          success: true
        };
        break;
      case "status":
        response = {
          success: true,
          is_logged: api.is_logged(),
          user: api.get_user(),
          creds: api.get_creds()
        };
        break;
      case "regen":
        api.regen_creds();
        response = {
          success: true,
          creds: api.get_creds()
        };
        break;
      case "user_details":
        response = await api.user_details();
        break;
      case "user_complex":
        response = await api.user_complex(params);
        break;
      case "leaderboard":
        response = await api.leaderboard();
        break;
      case "balasan_series":
        response = await api.balasan_series();
        break;
      case "notif":
        response = await api.notif();
        break;
      case "app_config":
        response = await api.app_config();
        break;
      case "set_history":
        response = await api.set_history(params);
        break;
      case "pub_chat":
        response = await api.pub_chat();
        break;
      case "pub_chat_ticky":
        response = await api.pub_chat_ticky();
        break;
      case "add_pub_chat":
        response = await api.add_pub_chat(params);
        break;
      case "nobar_chat":
        if (!params.room_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'room_id' wajib diisi untuk action 'nobar_chat'."
          });
        }
        response = await api.nobar_chat(params);
        break;
      case "add_nobar_chat":
        response = await api.add_nobar_chat(params);
        break;
      case "room_data":
        if (!params.room_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'room_id' wajib diisi untuk action 'room_data'."
          });
        }
        response = await api.room_data(params);
        break;
      case "room_member":
        if (!params.room_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'room_id' wajib diisi untuk action 'room_member'."
          });
        }
        response = await api.room_member(params);
        break;
      case "join_room":
        if (!params.room_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'room_id' wajib diisi untuk action 'join_room'."
          });
        }
        response = await api.join_room(params);
        break;
      case "leave_room":
        if (!params.room_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'room_id' wajib diisi untuk action 'leave_room'."
          });
        }
        response = await api.leave_room(params);
        break;
      case "set_room_data":
        response = await api.set_room_data(params);
        break;
      case "set_room_eps":
        response = await api.set_room_eps(params);
        break;
      case "nobar_room":
        response = await api.nobar_room();
        break;
      case "comments":
        response = await api.comments(params);
        break;
      case "comments_filter":
        response = await api.comments_filter(params);
        break;
      case "replies":
        response = await api.replies(params);
        break;
      case "comment_total":
        if (!params.post_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'post_id' wajib diisi untuk action 'comment_total'."
          });
        }
        response = await api.comment_total(params);
        break;
      case "comment_bg":
        response = await api.comment_bg(params);
        break;
      case "likes":
        if (!params.episode_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'episode_id' wajib diisi untuk action 'likes'."
          });
        }
        response = await api.likes(params);
        break;
      case "like_dislike":
        response = await api.like_dislike(params);
        break;
      case "pins":
        response = await api.pins();
        break;
      case "pin_categories":
        response = await api.pin_categories();
        break;
      case "pin_list":
        response = await api.pin_list();
        break;
      case "pin_overview":
        response = await api.pin_overview();
        break;
      case "report":
        response = await api.report(params);
        break;
      case "prices":
        response = await api.get_prices();
        break;
      case "check_invoice":
        if (!params.ref) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'ref' wajib diisi untuk action 'check_invoice'."
          });
        }
        response = await api.check_invoice(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server AnimeKita. Coba lagi nanti."
      });
    }
    if (response.error) {
      return res.status(400).json({
        status: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...Array.isArray(response) ? {
        data: response
      } : response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}