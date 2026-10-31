import axios from "axios";
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);
const SPOTIFY_RE = /^https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/[A-Za-z0-9]+/i;
const is2xx = s => typeof s === "number" && s >= 200 && s < 300;
class Spotmate {
  constructor() {
    this.token = "pGLXoCsVu0hcstAecIDwlrlbcrUzv0e1cWBJ0yuB";
    this.metaApi = "https://spotify.dlapi.app/api/Gettrack";
    this.convApi = "https://master.dlapi.app/api/v1/convert";
    this.taskApi = "https://master.dlapi.app/api/v1/tasks";
    this.pollMax = 60;
    this.pollMs = 3e3;
    this.fmt = "mp3";
    this.http = axios.create({
      timeout: 6e4,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true
    });
  }
  validate(input) {
    log("validate →");
    try {
      if (!input) throw new Error("input required");
      const {
        url
      } = input;
      if (typeof url !== "string") throw new Error("url must be string");
      const trimmed = url.trim();
      if (!trimmed) throw new Error("url must not be empty");
      if (!SPOTIFY_RE.test(trimmed)) throw new Error("url must be a valid open.spotify.com link");
      log("validate ok");
      return {
        ...input,
        url: trimmed
      };
    } catch (e) {
      log("validate err", e?.message ?? "?");
      throw e;
    }
  }
  async meta(url) {
    log("meta →", url);
    try {
      if (typeof url !== "string" || !SPOTIFY_RE.test(url)) {
        throw new Error("meta: invalid spotify url");
      }
      const r = await this.http.get(this.metaApi, {
        params: {
          spotify_url: url
        }
      });
      if (!is2xx(r?.status)) {
        throw new Error(`meta: http ${r?.status ?? "-"} ${r?.statusText ?? ""}`.trim());
      }
      const d = r?.data ?? null;
      if (!d) throw new Error("meta: empty response body");
      log("meta ok", d?.name ?? "(no name)");
      return d;
    } catch (e) {
      log("meta err", e?.response?.status ?? "-", e?.message ?? "?");
      throw e;
    }
  }
  async conv(url, format) {
    log("conv →", url);
    try {
      if (typeof url !== "string" || !SPOTIFY_RE.test(url)) {
        throw new Error("conv: invalid spotify url");
      }
      const fmt = (format || this.fmt || "mp3").trim();
      if (!fmt) throw new Error("conv: format required");
      const r = await this.http.post(this.convApi, {
        url: url,
        format: fmt
      });
      if (r?.status === 401) throw new Error("conv: unauthorized (check token)");
      if (r?.status >= 400) {
        throw new Error(`conv: http ${r?.status ?? "-"} ${r?.statusText ?? ""}`.trim());
      }
      const d = r?.data ?? {};
      const dl = d?.download_url || "";
      const tid = d?.task_id || "";
      if (r?.status === 202) {
        log("conv 202 accepted →", "task:", tid || "(missing!)", "keys:", Object.keys(d).join(",") || "(empty)");
      }
      if (!dl && !tid) {
        log("conv body:", JSON.stringify(d).slice(0, 300));
        throw new Error("conv: response missing download_url and task_id");
      }
      log("conv ok", "dl:", !!dl, "task:", tid || "-");
      return {
        downloadUrl: dl,
        taskId: tid,
        raw: d
      };
    } catch (e) {
      log("conv err", e?.response?.status ?? "-", e?.message ?? "?");
      throw e;
    }
  }
  async task(id) {
    log("task →", id);
    try {
      if (typeof id !== "string" || !id.trim()) throw new Error("task: task_id required");
      const r = await this.http.get(`${this.taskApi}/${id.trim()}`);
      if (!is2xx(r?.status)) {
        throw new Error(`task: http ${r?.status ?? "-"} ${r?.statusText ?? ""}`.trim());
      }
      const d = r?.data ?? {};
      const s = d?.status || "";
      log("task status:", s || "?");
      return {
        status: s,
        downloadUrl: d?.result?.download_url || "",
        raw: d
      };
    } catch (e) {
      log("task err", e?.response?.status ?? "-", e?.message ?? "?");
      throw e;
    }
  }
  async poll(id) {
    log("poll start →", id, `max=${this.pollMax}`);
    try {
      if (typeof id !== "string" || !id.trim()) throw new Error("poll: task_id required");
      for (let i = 1; i <= this.pollMax; i++) {
        log(`poll ${i}/${this.pollMax}`);
        const {
          status,
          downloadUrl
        } = await this.task(id);
        if (status === "finished") {
          if (!downloadUrl) throw new Error("poll: finished but no download_url");
          log("poll finished");
          return downloadUrl;
        }
        if (status === "failed") throw new Error(`poll: task ${id} failed`);
        await new Promise(r => setTimeout(r, this.pollMs));
      }
      throw new Error(`poll: timeout after ${this.pollMax} tries`);
    } catch (e) {
      log("poll err", e?.message ?? "?");
      throw e;
    }
  }
  async download({
    url,
    format,
    meta = true,
    ...rest
  } = {}) {
    log("=== download ===");
    try {
      const v = this.validate({
        url: url,
        format: format,
        meta: meta,
        ...rest
      });
      const m = meta ? await this.meta(v.url).catch(e => {
        log("meta skipped:", e?.message ?? "?");
        return null;
      }) : null;
      const firstArtist = Array.isArray(m?.artists) ? m.artists?.[0]?.name : m?.artists?.name;
      const title = m?.name || rest?.title || "";
      const artist = firstArtist || rest?.artist || "";
      const id = v.url.match(/(?:track|album|playlist|artist)[/:]([A-Za-z0-9]+)/i)?.[1] || Date.now();
      const name = (title ? `${artist ? artist + " - " : ""}${title}` : String(id)).replace(/[<>:"/\\|?*\r\n\t]/g, "_").slice(0, 200) || String(id);
      log("name:", name);
      const {
        downloadUrl,
        taskId
      } = await this.conv(v.url, v.format);
      const finalUrl = downloadUrl || (taskId ? await this.poll(taskId) : "");
      if (!finalUrl) throw new Error("no download_url available");
      log("=== done ===");
      return {
        name: name,
        title: title || null,
        artist: artist || null,
        trackId: id,
        format: v.format || this.fmt || "mp3",
        taskId: taskId || null,
        downloadUrl: finalUrl,
        meta: m
      };
    } catch (e) {
      log("=== fail ===", e?.response?.status ?? "-", e?.message ?? "?");
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Spotmate();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}