import axios from "axios";
import CryptoJS from "crypto-js";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
async function resolveFileInput(input, defaultName = "file") {
  if (Buffer.isBuffer(input)) {
    return {
      buffer: input,
      filename: defaultName,
      mimetype: "application/octet-stream"
    };
  }
  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) {
      const res = await axios.get(input, {
        responseType: "arraybuffer"
      });
      const ext = (input.split("?")[0].split(".").pop() || "bin").toLowerCase();
      const mime = res.headers["content-type"] || "application/octet-stream";
      return {
        buffer: Buffer.from(res.data),
        filename: `${defaultName}.${ext}`,
        mimetype: mime
      };
    }
    const dataUriMatch = input.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      const [, mime, b64] = dataUriMatch;
      const ext = mime.split("/")[1] || "bin";
      return {
        buffer: Buffer.from(b64, "base64"),
        filename: `${defaultName}.${ext}`,
        mimetype: mime
      };
    }
    if (input.length > 100 && /^[A-Za-z0-9+/]/.test(input)) {
      return {
        buffer: Buffer.from(input, "base64"),
        filename: defaultName,
        mimetype: "application/octet-stream"
      };
    }
  }
  throw new Error("Tidak dapat mengenali format file input. Gunakan URL, base64, Buffer, atau path lokal.");
}
class InsMelo {
  constructor() {
    this.baseUrl = "https://server.insmelo.com";
    this.keys = ["xvrEXqz1z0CAvd3LsJ9QJQasK1fOsQcTmEDten6gewU=", "D8zkQYqOYCKX/gYNE50tW860xYZdrGzdb6wxQ+DrZ3Y=", "PSzactGgQhtGJMw+gNnOHAQOkszfl/3afpaWmSl5u38=", "f8NxZ5CSe7jIkcmcqcOpXVX6f0nldPHB07BInMSNqwc=", "L37PfaPZTHUPG7g2P6tJjit+NAnpOD7KsusxpOgEYDg=", "EkFGL+REqMnoqzo0uGo/2iGcLdRMH1CmfxisoeExiww=", "8DmZgdyRJ0IPvLWPFHpdy3lqj2m/67Y+NJ4YwB7Ewxk=", "yQGoBtfrFX/w4lR1NfC6F6gie7N+FEW6Sh5p5OzUXKg=", "R5ahhm4sKIdAE4mI4RQi3RkPeawUNPkfjgK5Fyzp4Z0=", "/Qw7iFc3uQ+zjLyuEvXGwWaz8QliIu703Z+//2cVIWc="];
  }
  _log(step, message, data = null) {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    console.log(`[${timestamp}] [${step.toUpperCase()}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
  _encState(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  _decState(stateStr) {
    if (!stateStr) return null;
    try {
      return JSON.parse(Buffer.from(stateStr, "base64").toString("utf-8"));
    } catch {
      return null;
    }
  }
  _genTag() {
    const ms = Date.now();
    const rand4 = String(Math.floor(Math.random() * 1e4)).padStart(4, "0");
    const plain = `[insmelo]_${ms}_${rand4}`;
    const keyWA = CryptoJS.enc.Base64.parse(this.keys[Math.floor(Math.random() * this.keys.length)]);
    return CryptoJS.AES.encrypt(plain, keyWA, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).ciphertext.toString(CryptoJS.enc.Base64);
  }
  _getHeaders(session = null, extra = {}) {
    const h = {
      "Content-Type": "application/json",
      sys: "insmelo",
      clientType: "android",
      version: "1.0.0",
      "time-zone": "UTC+07:00",
      tag: this._genTag(),
      ...SpoofHead(),
      ...extra
    };
    if (session?.token) {
      h["token"] = session.token;
      h["userId"] = String(session.userId);
      h["Authorization"] = `Bearer ${session.token}`;
    }
    return h;
  }
  async _ensureSession(state) {
    let session = this._decState(state);
    if (!session) {
      this._log("auth", "State tidak ditemukan. Memulai Auto-Login...");
      const deviceId = `InsMelo_${CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex)}`;
      const res = await axios.post(`${this.baseUrl}/api/insmelo/user/loginByDevice`, {
        deviceId: deviceId
      }, {
        headers: this._getHeaders()
      });
      const d = res.data?.data || res.data;
      session = {
        token: d.token || d.accessToken || d.token?.accessToken,
        userId: d.userId || d.id || d.user?.id,
        deviceId: deviceId
      };
      if (!session.token) throw new Error("Token tidak ditemukan di response login.");
      this._log("auth", `Auto-Login Berhasil! UserID: ${session.userId}`);
    }
    return session;
  }
  async _uploadFile(session, fileInput, endpoint, fieldName = "file") {
    const {
      buffer,
      filename,
      mimetype
    } = await resolveFileInput(fileInput, fieldName);
    const fd = new FormData();
    fd.append(fieldName, buffer, {
      filename: filename,
      contentType: mimetype
    });
    const res = await axios.post(`${this.baseUrl}${endpoint}`, fd, {
      headers: {
        ...this._getHeaders(session),
        ...fd.getHeaders()
      }
    });
    return res.data?.data ?? res.data;
  }
  async model({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/model`, {}, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async persona({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/persona`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async generate({
    state = null,
    prompt,
    style = "Cinematic",
    title = "New Song",
    custom = false,
    instrumental = false,
    model = "chirp-v4-5",
    personaId = "chirp-v4-5",
    generateType = "DEFAULT",
    lyrics = "",
    tags = ""
  }) {
    try {
      const session = await this._ensureSession(state);
      this._log("generate", `Memproses: "${prompt}"`);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate`, {
        prompt: prompt,
        style: style,
        title: title,
        custom: custom,
        instrumental: instrumental,
        model: model,
        personaId: personaId,
        generateType: generateType,
        lyrics: lyrics,
        tags: tags
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async extendSong({
    state = null,
    musicId,
    prompt = "",
    style = "Cinematic",
    title = "Extended Song",
    continueAt = null,
    model = "chirp-v4-5"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/extend`, {
        musicId: musicId,
        prompt: prompt,
        style: style,
        title: title,
        continueAt: continueAt,
        model: model
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async replaceSegment({
    state = null,
    musicId,
    startTime,
    endTime,
    prompt = "",
    style = "Cinematic"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/replace`, {
        musicId: musicId,
        startTime: startTime,
        endTime: endTime,
        prompt: prompt,
        style: style
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async concatMusic({
    state = null,
    musicIds = [],
    title = "Merged Song"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/concat`, {
        musicIds: musicIds,
        title: title
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async retryGeneration({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/tryAgain`, {
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async deleteAllFailed({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/delete/all`, {}, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async generateStems({
    state = null,
    musicId,
    type = "vocals"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/stems`, {
        musicId: musicId,
        type: type
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async generateAllStems({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/generate/allStems`, {
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async status({
    state = null,
    page = 1,
    size = 20,
    category = "all"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/page`, {
        params: {
          category: category,
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getSong({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/song`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async editSong({
    state = null,
    musicId,
    title = null,
    coverImageUrl = null,
    tags = null,
    description = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const body = {
        musicId: musicId
      };
      if (title !== null) body.title = title;
      if (coverImageUrl !== null) body.coverImageUrl = coverImageUrl;
      if (tags !== null) body.tags = tags;
      if (description !== null) body.description = description;
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/edit`, body, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async deleteSong({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/delete`, {
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async collectSong({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/collect`, {
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async unCollectSong({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/unCollect`, {
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getMva({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/mva`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getMidi({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/midi`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getStemsInfo({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/stems`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getLyricsInfo({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/lyrics/info`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async requestLyrics({
    state = null,
    musicId,
    language = "en",
    style = "pop"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/info/lyrics/request`, {
        musicId: musicId,
        language: language,
        style: style
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getCoverList({
    state = null,
    musicId,
    page = 1,
    size = 20
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/info/coverList`, {
        params: {
          musicId: musicId,
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async aiCover({
    state = null,
    musicId,
    voiceModelId,
    pitch = 0,
    speed = 1,
    title = "AI Cover"
  }) {
    try {
      const session = await this._ensureSession(state);
      this._log("aiCover", `Converting musicId=${musicId} with voiceModelId=${voiceModelId}`);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/convert/doConvert`, {
        musicId: musicId,
        voiceModelId: voiceModelId,
        pitch: pitch,
        speed: speed,
        title: title
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getConvertList({
    state = null,
    page = 1,
    size = 20
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/convert/list`, {
        params: {
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getSysVoiceModels({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/convert/model/sys`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getUserVoiceModels({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/convert/model/user`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async cloneVoice({
    state = null,
    audioFile,
    name = "My Voice",
    gender = "male",
    language = "en"
  }) {
    try {
      const session = await this._ensureSession(state);
      this._log("cloneVoice", `Uploading audio for voice clone: "${name}"`);
      const audioUrl = await this._uploadFile(session, audioFile, "/api/insmelo/file/upload", "file");
      const res = await axios.post(`${this.baseUrl}/api/insmelo/convert/clone`, {
        audioUrl: audioUrl?.url ?? audioUrl,
        name: name,
        gender: gender,
        language: language
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async tryCloneVoice({
    state = null,
    audioFile,
    gender = "male",
    language = "en"
  }) {
    try {
      const session = await this._ensureSession(state);
      this._log("tryCloneVoice", "Uploading audio for try-clone preview");
      const audioUrl = await this._uploadFile(session, audioFile, "/api/insmelo/file/upload", "file");
      const res = await axios.post(`${this.baseUrl}/api/insmelo/convert/tryClone`, {
        audioUrl: audioUrl?.url ?? audioUrl,
        gender: gender,
        language: language
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async updateVoiceModel({
    state = null,
    voiceModelId,
    name = null,
    gender = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const body = {
        voiceModelId: voiceModelId
      };
      if (name !== null) body.name = name;
      if (gender !== null) body.gender = gender;
      const res = await axios.post(`${this.baseUrl}/api/insmelo/convert/model/update`, body, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async deleteVoiceModel({
    state = null,
    voiceModelId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/convert/model/delete`, {
        voiceModelId: voiceModelId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async uploadAudio({
    state = null,
    audioFile
  }) {
    try {
      const session = await this._ensureSession(state);
      const data = await this._uploadFile(session, audioFile, "/api/insmelo/file/upload", "file");
      return {
        success: true,
        data: data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async uploadImage({
    state = null,
    imageFile
  }) {
    try {
      const session = await this._ensureSession(state);
      const data = await this._uploadFile(session, imageFile, "/api/insmelo/file/upload/img", "file");
      return {
        success: true,
        data: data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getUserProfile({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/user/currentUser`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async editUser({
    state = null,
    nickname = null,
    avatarUrl = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const body = {};
      if (nickname !== null) body.nickname = nickname;
      if (avatarUrl !== null) body.avatarUrl = avatarUrl;
      const res = await axios.post(`${this.baseUrl}/api/insmelo/user/editUser`, body, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getPlaylists({
    state = null,
    page = 1,
    size = 20
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/playlist/page`, {
        params: {
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async addPlaylist({
    state = null,
    name,
    description = ""
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/add`, {
        name: name,
        description: description
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async modifyPlaylist({
    state = null,
    playlistId,
    name = null,
    description = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const body = {
        playlistId: playlistId
      };
      if (name !== null) body.name = name;
      if (description !== null) body.description = description;
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/modify`, body, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async deletePlaylist({
    state = null,
    playlistId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/del`, {
        playlistId: playlistId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async addSongToPlaylist({
    state = null,
    playlistId,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/music/info`, {
        playlistId: playlistId,
        musicId: musicId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getPlaylistSongs({
    state = null,
    playlistId,
    page = 1,
    size = 20
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/playlist/music/page`, {
        params: {
          playlistId: playlistId,
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async collectPlaylist({
    state = null,
    playlistId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/collect`, {
        playlistId: playlistId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async unCollectPlaylist({
    state = null,
    playlistId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/playlist/unCollect`, {
        playlistId: playlistId
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getPlazaHome({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/work/plaza/home`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getPlazaList({
    state = null,
    page = 1,
    size = 20,
    category = "all"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/work/plaza/list`, {
        params: {
          page: page,
          size: size,
          category: category
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getPlazaMusicInfo({
    state = null,
    musicId
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/work/plaza/music/info`, {
        params: {
          musicId: musicId
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async publishMusic({
    state = null,
    musicId,
    isPublic = true
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/work/plaza/music/publish`, {
        musicId: musicId,
        isPublic: isPublic
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async musicOperation({
    state = null,
    musicId,
    operationType = "like"
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.post(`${this.baseUrl}/api/insmelo/work/plaza/music/operation`, {
        musicId: musicId,
        operationType: operationType
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getAuthorOtherWorks({
    state = null,
    authorId,
    page = 1,
    size = 20
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/work/plaza/author/other/list`, {
        params: {
          authorId: authorId,
          page: page,
          size: size
        },
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async submitSatisfaction({
    state = null,
    musicId,
    rating,
    comment = ""
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.put(`${this.baseUrl}/api/insmelo/info/satisfaction`, {
        musicId: musicId,
        rating: rating,
        comment: comment
      }, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
  async getLatestVersion({
    state = null
  }) {
    try {
      const session = await this._ensureSession(state);
      const res = await axios.get(`${this.baseUrl}/api/insmelo/version/getLatest`, {
        headers: this._getHeaders(session)
      });
      return {
        success: true,
        data: res.data?.data,
        state: this._encState(session)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        state: state
      };
    }
  }
}
const ACTION_MAP = {
  model: {
    method: "model",
    required: []
  },
  persona: {
    method: "persona",
    required: []
  },
  status: {
    method: "status",
    required: []
  },
  getSong: {
    method: "getSong",
    required: ["musicId"]
  },
  editSong: {
    method: "editSong",
    required: ["musicId"]
  },
  deleteSong: {
    method: "deleteSong",
    required: ["musicId"]
  },
  collectSong: {
    method: "collectSong",
    required: ["musicId"]
  },
  unCollectSong: {
    method: "unCollectSong",
    required: ["musicId"]
  },
  getMva: {
    method: "getMva",
    required: ["musicId"]
  },
  getMidi: {
    method: "getMidi",
    required: ["musicId"]
  },
  getStemsInfo: {
    method: "getStemsInfo",
    required: ["musicId"]
  },
  getLyricsInfo: {
    method: "getLyricsInfo",
    required: ["musicId"]
  },
  requestLyrics: {
    method: "requestLyrics",
    required: ["musicId"]
  },
  generate: {
    method: "generate",
    required: ["prompt"]
  },
  extendSong: {
    method: "extendSong",
    required: ["musicId"]
  },
  replaceSegment: {
    method: "replaceSegment",
    required: ["musicId", "startTime", "endTime"]
  },
  concatMusic: {
    method: "concatMusic",
    required: ["musicIds"]
  },
  retryGeneration: {
    method: "retryGeneration",
    required: ["musicId"]
  },
  deleteAllFailed: {
    method: "deleteAllFailed",
    required: []
  },
  generateStems: {
    method: "generateStems",
    required: ["musicId"]
  },
  generateAllStems: {
    method: "generateAllStems",
    required: ["musicId"]
  },
  aiCover: {
    method: "aiCover",
    required: ["musicId", "voiceModelId"]
  },
  getCoverList: {
    method: "getCoverList",
    required: ["musicId"]
  },
  getConvertList: {
    method: "getConvertList",
    required: []
  },
  getSysVoiceModels: {
    method: "getSysVoiceModels",
    required: []
  },
  getUserVoiceModels: {
    method: "getUserVoiceModels",
    required: []
  },
  cloneVoice: {
    method: "cloneVoice",
    required: ["audioFile"]
  },
  tryCloneVoice: {
    method: "tryCloneVoice",
    required: ["audioFile"]
  },
  updateVoiceModel: {
    method: "updateVoiceModel",
    required: ["voiceModelId"]
  },
  deleteVoiceModel: {
    method: "deleteVoiceModel",
    required: ["voiceModelId"]
  },
  uploadAudio: {
    method: "uploadAudio",
    required: ["audioFile"]
  },
  uploadImage: {
    method: "uploadImage",
    required: ["imageFile"]
  },
  getUserProfile: {
    method: "getUserProfile",
    required: []
  },
  editUser: {
    method: "editUser",
    required: []
  },
  getPlaylists: {
    method: "getPlaylists",
    required: []
  },
  addPlaylist: {
    method: "addPlaylist",
    required: ["name"]
  },
  modifyPlaylist: {
    method: "modifyPlaylist",
    required: ["playlistId"]
  },
  deletePlaylist: {
    method: "deletePlaylist",
    required: ["playlistId"]
  },
  addSongToPlaylist: {
    method: "addSongToPlaylist",
    required: ["playlistId", "musicId"]
  },
  getPlaylistSongs: {
    method: "getPlaylistSongs",
    required: ["playlistId"]
  },
  collectPlaylist: {
    method: "collectPlaylist",
    required: ["playlistId"]
  },
  unCollectPlaylist: {
    method: "unCollectPlaylist",
    required: ["playlistId"]
  },
  getPlazaHome: {
    method: "getPlazaHome",
    required: []
  },
  getPlazaList: {
    method: "getPlazaList",
    required: []
  },
  getPlazaMusicInfo: {
    method: "getPlazaMusicInfo",
    required: ["musicId"]
  },
  publishMusic: {
    method: "publishMusic",
    required: ["musicId"]
  },
  musicOperation: {
    method: "musicOperation",
    required: ["musicId"]
  },
  getAuthorOtherWorks: {
    method: "getAuthorOtherWorks",
    required: ["authorId"]
  },
  submitSatisfaction: {
    method: "submitSatisfaction",
    required: ["musicId", "rating"]
  },
  getLatestVersion: {
    method: "getLatestVersion",
    required: []
  }
};
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: Object.keys(ACTION_MAP)
    });
  }
  const actionDef = ACTION_MAP[action];
  if (!actionDef) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: Object.keys(ACTION_MAP)
    });
  }
  const missing = actionDef.required.filter(k => params[k] === undefined || params[k] === null || params[k] === "");
  if (missing.length > 0) {
    return res.status(400).json({
      status: false,
      error: `Parameter berikut wajib diisi untuk action '${action}': ${missing.join(", ")}.`
    });
  }
  const api = new InsMelo();
  try {
    const response = await api[actionDef.method](params);
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}