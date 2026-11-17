import { withApiLog } from "@/lib/apiLogger.cjs";
import connectMongo from "@/lib/mongoose";
import Paste from "@/models/Paste";
import crypto from "crypto";

const generateRandomKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(8)).map(byte => chars[byte % chars.length]).join("");
};

const KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asStr = v => (v === undefined || v === null ? undefined : String(v));

/** Detik -> tanggal kedaluwarsa. null = tidak pernah, undefined = tidak valid. */
const parseExpire = v => {
  if (v === undefined || v === null || v === "" || v === "0" || v === 0 || v === "never") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n === 0 ? null : new Date(Date.now() + Math.floor(n) * 1e3);
};

const serialize = (p, { summary = false } = {}) => ({
  title: p.title,
  content: summary && p.content.length > 240 ? p.content.slice(0, 240) : p.content,
  key: p.key,
  syntax: p.syntax,
  size: p.content.length,
  truncated: summary && p.content.length > 240,
  expiresAt: p.expiresAt,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt
});

async function handler(req, res) {
  try {
    await connectMongo();
    const body = req.method === "POST" ? req.body || {} : req.query;
    const action = asStr(body.action);
    const key = asStr(body.key);
    const title = asStr(body.title);
    const content = asStr(body.content);
    const syntax = asStr(body.syntax);
    const expireIn = body.expireIn;
    const isRaw = asStr(body.raw) === "true";
    const requestedOutput = body.output ? String(body.output).toLowerCase() : "json";
    const wantsText = isRaw || requestedOutput === "text";
    const setResponse = (data, statusCode, contentType) => {
      res.setHeader("Content-Type", contentType);
      return res.status(statusCode).send(data);
    };
    // Pesan sederhana (error/info) mengikuti format output yang diminta
    const msg = (statusCode, obj, text) => wantsText ? setResponse(text, statusCode, "text/plain") : setResponse(JSON.stringify(obj), statusCode, "application/json");

    switch (action) {
      case "create": {
        if (!title || !content) return msg(400, { error: "Title and content are required" }, "Title and content are required");
        if (key && !KEY_RE.test(key)) return msg(400, { error: "Key hanya boleh huruf, angka, '-' dan '_' (maks 64 karakter)" }, "Invalid key");
        const expirationDate = parseExpire(expireIn);
        if (expirationDate === undefined) return msg(400, { error: "expireIn harus berupa detik (angka >= 0)" }, "Invalid expireIn");
        let newKey = key || generateRandomKey();
        while (await Paste.findOne({ key: newKey })) newKey = generateRandomKey();
        const newPaste = new Paste({
          title,
          content,
          key: newKey,
          syntax: syntax || "text",
          expiresAt: expirationDate,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newPaste.save();
        if (isRaw) return setResponse(newPaste.content, 201, "text/plain");
        switch (requestedOutput) {
          case "text":
            return setResponse(newPaste.content, 201, "text/plain");
          case "html":
            return setResponse(newPaste.content, 201, "text/html");
          default:
            return setResponse(JSON.stringify(serialize(newPaste)), 201, "application/json");
        }
      }
      case "get": {
        if (!key && !title) return msg(400, { error: "Key or title is required to get paste" }, "Key or title is required to get paste");
        let paste = key ? await Paste.findOne({ key }) : await Paste.findOne({ title });
        if (!paste) {
          paste = new Paste({
            title: title || "Untitled",
            content: "This paste was automatically initialized as it was not found.",
            key: key && KEY_RE.test(key) ? key : generateRandomKey(),
            syntax: syntax || "text",
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await paste.save();
        }
        if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) return msg(410, { error: "Paste has expired" }, "Paste has expired");
        if (isRaw) return setResponse(paste.content, 200, "text/plain");
        switch (requestedOutput) {
          case "text":
            return setResponse(paste.content, 200, "text/plain");
          case "html":
            return setResponse(paste.content, 200, "text/html");
          default:
            return setResponse(JSON.stringify(serialize(paste)), 200, "application/json");
        }
      }
      case "update": {
        if (!key) return msg(400, { error: "Key is required to update paste" }, "Key is required to update paste");
        const patch = { updatedAt: new Date() };
        if (title !== undefined) {
          if (!title.trim()) return msg(400, { error: "Title tidak boleh kosong" }, "Title is empty");
          patch.title = title;
        }
        if (content !== undefined) {
          if (!content.length) return msg(400, { error: "Content tidak boleh kosong" }, "Content is empty");
          patch.content = content;
        }
        if (syntax !== undefined) patch.syntax = syntax || "text";
        if (expireIn !== undefined) {
          const exp = parseExpire(expireIn);
          if (exp === undefined) return msg(400, { error: "expireIn harus berupa detik (angka >= 0)" }, "Invalid expireIn");
          patch.expiresAt = exp;
        }
        const updated = await Paste.findOneAndUpdate({ key }, { $set: patch }, { new: true });
        if (!updated) return msg(404, { error: "Paste not found" }, "Paste not found");
        return wantsText ? setResponse(updated.content, 200, "text/plain") : setResponse(JSON.stringify(serialize(updated)), 200, "application/json");
      }
      case "delete": {
        if (!key) return msg(400, { error: "Key is required to delete paste" }, "Key is required to delete paste");
        const pasteToDelete = await Paste.findOneAndDelete({ key });
        if (!pasteToDelete) return msg(404, { error: "Paste not found" }, "Paste not found");
        return msg(200, { message: `Paste with key ${key} has been deleted` }, `Paste with key ${key} has been deleted`);
      }
      case "clear": {
        await Paste.deleteMany({});
        return msg(200, { message: "All pastes have been cleared" }, "All pastes have been cleared");
      }
      case "list": {
        // search, limit, summary=true (potong konten untuk daftar) — tanpa parameter perilaku tetap seperti semula
        const filter = {};
        const search = asStr(body.search);
        if (search) {
          const rx = new RegExp(escapeRegex(search.slice(0, 100)), "i");
          filter.$or = [{ title: rx }, { key: rx }];
        }
        let q = Paste.find(filter).sort({ createdAt: -1 });
        const limit = parseInt(body.limit, 10);
        if (Number.isFinite(limit) && limit > 0) q = q.limit(Math.min(limit, 500));
        const allPastes = await q;
        const summary = asStr(body.summary) === "true";
        return setResponse(JSON.stringify(summary ? allPastes.map(p => serialize(p, { summary: true })) : allPastes), 200, "application/json");
      }
      default:
        return msg(400, { error: "Invalid action" }, "Invalid action");
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withApiLog(handler);
