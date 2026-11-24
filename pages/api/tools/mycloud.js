import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";

class CloudDriveClient {
  constructor() {
    this.apiKey = "AIzaSyCer9Hq5QBbBpd8ZW4AGpcJATJ8IbQx75A";
    this.project = "cloud-storage-f0662";
    this.bucketName = "cloud-storage-f0662.firebasestorage.app";
    this.authBase = "https://identitytoolkit.googleapis.com/v1";
    this.storeBase = `https://firestore.googleapis.com/v1/projects/${this.project}/databases/(default)/documents`;
    this.bucketBase = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}`;
    this.tokenMarginMs = 5 * 60 * 1000;
  }

  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }

  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }

  ctx(state) {
    const d = this.b64d(state);
    return {
      uid: d?.uid || null,
      idToken: d?.idToken || null,
      refreshToken: d?.refreshToken || null,
      expiresAt: Number(d?.expiresAt) || 0
    };
  }

  md5(data) {
    return crypto.createHash("md5").update(data).digest("hex");
  }

  async post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
    return json;
  }

  async signIn() {
    console.log("[AUTH] Firebase anonymous signUp...");
    const json = await this.post(`${this.authBase}/accounts:signUp?key=${this.apiKey}`, {
      returnSecureToken: true
    });
    return {
      uid: json.localId,
      idToken: json.idToken,
      refreshToken: json.refreshToken,
      expiresAt: Date.now() + Number(json.expiresIn || 3600) * 1000
    };
  }

  async refreshTokenCall(refreshToken) {
    console.log("[AUTH] Refreshing Firebase token...");
    const json = await this.post(`https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`, {
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
    return {
      uid: json.user_id,
      idToken: json.id_token,
      refreshToken: json.refresh_token || refreshToken,
      expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000
    };
  }

  async ensure_c(state, forceNew = false) {
    let c = this.ctx(forceNew ? null : state);
    if (!c.uid || !c.idToken) {
      c = await this.signIn();
      return c;
    }
    if (c.expiresAt && Date.now() >= c.expiresAt - this.tokenMarginMs) {
      if (c.refreshToken) {
        try {
          c = await this.refreshTokenCall(c.refreshToken);
          return c;
        } catch {}
      }
      c = await this.signIn();
    }
    return c;
  }

  async signed(c, url, init = {}, retry = true) {
    const res = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${c.idToken}`,
        ...(init.headers || {})
      }
    });

    if (res.status === 401 && retry && c.refreshToken) {
      const refreshed = await this.refreshTokenCall(c.refreshToken);
      c.uid = refreshed.uid;
      c.idToken = refreshed.idToken;
      c.refreshToken = refreshed.refreshToken;
      c.expiresAt = refreshed.expiresAt;
      return this.signed(c, url, init, false);
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
    return json;
  }

  scalar(v) {
    return v == null
      ? null
      : v.stringValue ??
          (v.integerValue != null
            ? Number(v.integerValue)
            : v.booleanValue ?? (v.doubleValue != null ? Number(v.doubleValue) : null));
  }

  mapDoc(doc) {
    const f = doc.fields || {};
    return {
      id: doc.name.split("/").pop(),
      ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, this.scalar(v)]))
    };
  }

  toFields(o) {
    return Object.fromEntries(
      Object.entries(o).map(([k, v]) => [
        k,
        v == null
          ? { nullValue: null }
          : typeof v === "boolean"
            ? { booleanValue: v }
            : typeof v === "number"
              ? Number.isInteger(v)
                ? { integerValue: String(v) }
                : { doubleValue: v }
              : { stringValue: String(v) }
      ])
    );
  }

  async query(c, collectionId, where) {
    const q = { structuredQuery: { from: [{ collectionId }] } };
    if (where) q.structuredQuery.where = where;
    const json = await this.signed(c, `${this.storeBase}/users/${c.uid}:runQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(q)
    });
    return (Array.isArray(json) ? json : [])
      .filter((r) => r.document)
      .map((r) => this.mapDoc(r.document));
  }

  async res_file(input, customName = "", customMime = "") {
    if (!input) return null;

    if (Buffer.isBuffer(input)) {
      return {
        buffer: input,
        name: customName || `file_${Date.now()}.bin`,
        mime: customMime || "application/octet-stream"
      };
    }

    if (typeof input === "string") {
      const str = input.trim();
      if (/^https?:\/\//i.test(str)) {
        console.log(`[FILE] Mengunduh file dari URL: ${str}`);
        const res = await axios.get(str, { responseType: "arraybuffer" });
        const buffer = Buffer.from(res.data);
        const ct = res.headers["content-type"] || "application/octet-stream";

        let derivedName = customName;
        if (!derivedName) {
          const cd = res.headers["content-disposition"] || "";
          const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
          if (m && m[1]) {
            derivedName = decodeURIComponent(m[1].trim());
          } else {
            try {
              const pathname = new URL(str).pathname;
              const base = pathname.split("/").filter(Boolean).pop();
              if (base) derivedName = decodeURIComponent(base);
            } catch {}
          }
        }

        return {
          buffer,
          name: derivedName || `file_${Date.now()}.bin`,
          mime: customMime || ct.split(";")[0].trim()
        };
      }

      if (str.startsWith("data:")) {
        const match = str.match(/^data:([^;]+);base64,(.+)$/i);
        if (!match) return null;
        const mime = match[1].toLowerCase();
        const ext = mime.split("/")[1]?.split("+")[0] || "bin";
        return {
          buffer: Buffer.from(match[2], "base64"),
          name: customName || `file_${Date.now()}.${ext}`,
          mime: customMime || mime
        };
      }

      return {
        buffer: Buffer.from(str, "base64"),
        name: customName || `file_${Date.now()}.bin`,
        mime: customMime || "application/octet-stream"
      };
    }

    return null;
  }

  async reg_dev({ state, force = false } = {}) {
    let c = null;
    try {
      const shouldForce = force === true || force === "true";
      c = await this.ensure_c(state, shouldForce);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          uid: c.uid,
          idToken: c.idToken,
          refreshToken: c.refreshToken,
          expiresAt: c.expiresAt
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_reg_dev" },
        state: b64,
        State: b64
      };
    }
  }

  async refresh({ state, refresh_token, refreshToken } = {}) {
    let c = this.ctx(state);
    try {
      const rt = refresh_token || refreshToken || c.refreshToken;
      if (!rt) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'state' atau 'refresh_token' wajib diisi." },
          state: b64,
          State: b64
        };
      }
      c = await this.refreshTokenCall(rt);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          uid: c.uid,
          idToken: c.idToken,
          refreshToken: c.refreshToken,
          expiresAt: c.expiresAt
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_refresh" },
        state: b64,
        State: b64
      };
    }
  }

  async list_files({ state, parentId, parent_id, includeDeleted, include_deleted } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const pId = parentId ?? parent_id;
      const incDel = includeDeleted === true || includeDeleted === "true" || include_deleted === true || include_deleted === "true";
      const where = pId
        ? {
            fieldFilter: {
              field: { fieldPath: "parentId" },
              op: "EQUAL",
              value: { stringValue: String(pId) }
            }
          }
        : undefined;

      const rows = await this.query(c, "files", where);
      const files = incDel ? rows : rows.filter((r) => !r.deleted);
      const b64 = this.b64e(c);

      return {
        status: true,
        result: {
          uid: c.uid,
          total: files.length,
          files
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_list_files" },
        state: b64,
        State: b64
      };
    }
  }

  async list_folders({ state, includeDeleted, include_deleted } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const incDel = includeDeleted === true || includeDeleted === "true" || include_deleted === true || include_deleted === "true";
      const rows = await this.query(c, "folders");
      const folders = incDel ? rows : rows.filter((r) => !r.deleted);
      const b64 = this.b64e(c);

      return {
        status: true,
        result: {
          uid: c.uid,
          total: folders.length,
          folders
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_list_folders" },
        state: b64,
        State: b64
      };
    }
  }

  async upload({ state, file, url, data, name, filename, mime, parentId, parent_id = "" } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const fileInput = file || url || data;
      if (!fileInput) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'file' (URL/Base64/Buffer) wajib diisi." },
          state: b64,
          State: b64
        };
      }

      const resolved = await this.res_file(fileInput, name || filename, mime);
      if (!resolved || !resolved.buffer || resolved.buffer.length === 0) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Format file tidak valid atau file kosong." },
          state: b64,
          State: b64
        };
      }

      const fileName = resolved.name;
      const mimeType = resolved.mime;
      const buffer = resolved.buffer;
      const storagePath = `users/${c.uid}/files/${fileName}`;

      console.log(`[UPLOAD] Mengunggah ${fileName} (${buffer.length} bytes)...`);
      let res = await fetch(`${this.bucketBase}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${c.idToken}`,
          "content-type": mimeType
        },
        body: buffer
      });

      if (res.status === 401 && c.refreshToken) {
        c = await this.refreshTokenCall(c.refreshToken);
        res = await fetch(`${this.bucketBase}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${c.idToken}`,
            "content-type": mimeType
          },
          body: buffer
        });
      }

      const up = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(up.error?.message || `HTTP ${res.status}`);

      const size = buffer.byteLength ?? Buffer.byteLength(buffer);
      const digest = this.md5(buffer);
      const mediaUrl = `${this.bucketBase}/o/${encodeURIComponent(storagePath)}?alt=media`;
      const downloadUrl = up.downloadTokens ? `${mediaUrl}&token=${up.downloadTokens}` : mediaUrl;

      const doc = {
        id: crypto.randomUUID(),
        name: fileName,
        parentId: String(parentId ?? parent_id ?? ""),
        url: mediaUrl,
        size,
        mimeType,
        uploadDate: Date.now(),
        userId: c.uid,
        deleted: false,
        deletedDate: null,
        md5: digest
      };

      const patch = await this.signed(c, `${this.storeBase}/users/${c.uid}/files?documentId=${doc.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields: this.toFields(doc) })
      });

      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          ...this.mapDoc(patch),
          download_url: downloadUrl,
          storage: up
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_upload" },
        state: b64,
        State: b64
      };
    }
  }

  async download({ state, name, filename, raw = false } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const fileName = name || filename;
      if (!fileName) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'name' wajib diisi." },
          state: b64,
          State: b64
        };
      }

      const storagePath = `users/${c.uid}/files/${fileName}`;
      let res = await fetch(`${this.bucketBase}/o/${encodeURIComponent(storagePath)}?alt=media`, {
        headers: { authorization: `Bearer ${c.idToken}` }
      });

      if (res.status === 401 && c.refreshToken) {
        c = await this.refreshTokenCall(c.refreshToken);
        res = await fetch(`${this.bucketBase}/o/${encodeURIComponent(storagePath)}?alt=media`, {
          headers: { authorization: `Bearer ${c.idToken}` }
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") || "application/octet-stream";
      const b64 = this.b64e(c);
      const isRaw = raw === true || raw === "true";

      return {
        status: true,
        ...(isRaw ? { _buffer: buffer } : {}),
        result: {
          name: fileName,
          mime,
          size: buffer.length,
          ...(!isRaw
            ? {
                base64: buffer.toString("base64"),
                data_url: `data:${mime};base64,${buffer.toString("base64")}`
              }
            : {})
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_download" },
        state: b64,
        State: b64
      };
    }
  }

  async remove({ state, docId, doc_id, id, name, filename } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetDocId = docId || doc_id || id;
      let targetName = name || filename;

      if (!targetDocId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'doc_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }

      if (!targetName) {
        const listed = await this.query(c, "files");
        const found = listed.find((f) => f.id === String(targetDocId));
        if (found?.name) targetName = found.name;
      }

      if (!targetName) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'name' wajib diisi (atau tidak ditemukan dari doc_id)." },
          state: b64,
          State: b64
        };
      }

      const patch = await this.signed(
        c,
        `${this.storeBase}/users/${c.uid}/files/${targetDocId}?updateMask.fieldPaths=deleted&updateMask.fieldPaths=deletedDate`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fields: {
              deleted: { booleanValue: true },
              deletedDate: { integerValue: String(Date.now()) }
            }
          })
        }
      );

      const storagePath = `users/${c.uid}/files/${targetName}`;
      const del = await this.signed(c, `${this.bucketBase}/o/${encodeURIComponent(storagePath)}`, {
        method: "DELETE"
      });

      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          firestore: this.mapDoc(patch),
          storage: del
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_remove" },
        state: b64,
        State: b64
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = [
    "reg_dev",
    "refresh",
    "list_files",
    "list_folders",
    "upload",
    "download",
    "remove"
  ];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          refresh: "/?action=refresh&state=BASE64_STATE",
          list_files: "/?action=list_files&state=BASE64_STATE",
          list_folders: "/?action=list_folders&state=BASE64_STATE",
          upload: {
            url: "/?action=upload",
            body: {
              state: "BASE64_STATE",
              name: "photo.jpg",
              file: "https://.../photo.jpg atau base64"
            }
          },
          download_json: "/?action=download&state=BASE64_STATE&name=photo.jpg",
          download_raw: "/?action=download&state=BASE64_STATE&name=photo.jpg&raw=true",
          remove: "/?action=remove&state=BASE64_STATE&doc_id=DOC_ID&name=photo.jpg"
        }
      }
    });
  }

  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions
    });
  }

  const api = new CloudDriveClient();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "refresh":
        response = await api.refresh(params);
        break;
      case "list_files":
        response = await api.list_files(params);
        break;
      case "list_folders":
        response = await api.list_folders(params);
        break;
      case "upload": {
        const fileInput = params.file || params.url || params.data;
        if (!fileInput) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'file' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.upload(params);
        break;
      }
      case "download": {
        const fileName = params.name || params.filename;
        if (!fileName) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'name' wajib diisi."
          });
        }
        response = await api.download(params);
        if (response?.status && response._buffer) {
          res.setHeader("Content-Type", response.result.mime || "application/octet-stream");
          res.setHeader("Content-Disposition", `attachment; filename="${response.result.name}"`);
          return res.status(200).send(response._buffer);
        }
        break;
      }
      case "remove": {
        const docId = params.docId || params.doc_id || params.id;
        if (!docId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'doc_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.remove(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada Firebase Cloud Drive.",
        result: response?.result || null,
        state: response?.state || null
      });
    }

    return res.status(200).json({
      action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));