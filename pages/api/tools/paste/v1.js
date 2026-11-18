import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import connectMongo from "@/lib/mongoose";
import Paste from "@/models/Paste";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";

/**
 * Paste API v1 — /api/tools/paste/v1
 *   GET|POST ?action=create|get|update|delete|list|clear
 * Tambahan: action=update (edit), strict=true pada get (404 bila tidak ada, tanpa auto-buat),
 * dan action=clear kini butuh adminKey.
 */
const generateRandomKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(8)).map(byte => chars[byte % chars.length]).join("");
};
async function handler(req, res) {
  try {
    await connectMongo();
    const {
      action,
      key,
      title,
      content,
      raw,
      output,
      syntax,
      expireIn,
      strict,
      adminKey
    } = (req.method === "POST" ? req.body : req.query) || {};
    const isRaw = raw === "true";
    const requestedOutput = output ? String(output).toLowerCase() : "json";
    const setResponse = (data, statusCode, contentType) => {
      res.setHeader("Content-Type", contentType);
      return res.status(statusCode).send(data);
    };
    switch (action) {
      case "create":
        if (!title || !content) {
          return setResponse(JSON.stringify({
            error: "Title and content are required"
          }), 400, "application/json");
        }
        let newKey = key || generateRandomKey();
        while (await Paste.findOne({
            key: newKey
          })) {
          newKey = generateRandomKey();
        }
        const expSec = parseInt(expireIn, 10);
        const expirationDate = expSec > 0 ? new Date(Date.now() + expSec * 1e3) : null;
        const newPaste = new Paste({
          title: title,
          content: content,
          key: newKey,
          syntax: syntax || "text",
          expiresAt: expirationDate,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newPaste.save();
        const responseData = {
          title: newPaste.title,
          content: newPaste.content,
          key: newPaste.key,
          syntax: newPaste.syntax,
          expiresAt: newPaste.expiresAt,
          createdAt: newPaste.createdAt,
          updatedAt: newPaste.updatedAt
        };
        if (isRaw) {
          return setResponse(newPaste.content, 201, "text/plain");
        }
        switch (requestedOutput) {
          case "text":
            return setResponse(newPaste.content, 201, "text/plain");
          case "html":
            return setResponse(newPaste.content, 201, "text/html");
          case "json":
          default:
            return setResponse(JSON.stringify(responseData), 201, "application/json");
        }
      case "get":
        if (!key && !title) {
          return setResponse(JSON.stringify({
            error: "Key or title is required to get paste"
          }), 400, "application/json");
        }
        let paste;
        if (key) paste = await Paste.findOne({
          key: key
        });
        else if (title) paste = await Paste.findOne({
          title: title
        });
        if (!paste && String(strict) === "true") {
          return setResponse(JSON.stringify({
            error: "Paste not found"
          }), 404, "application/json");
        }
        if (!paste) {
          paste = new Paste({
            title: title || "Untitled",
            content: "This paste was automatically initialized as it was not found.",
            key: key || generateRandomKey(),
            syntax: syntax || "text",
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await paste.save();
        }
        if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
          const expiredMessage = {
            error: "Paste has expired"
          };
          return isRaw ? setResponse("Paste has expired", 410, "text/plain") : requestedOutput === "text" ? setResponse("Paste has expired", 410, "text/plain") : setResponse(JSON.stringify(expiredMessage), 410, "application/json");
        }
        if (isRaw) {
          return setResponse(paste.content, 200, "text/plain");
        }
        switch (requestedOutput) {
          case "text":
            return setResponse(paste.content, 200, "text/plain");
          case "html":
            return setResponse(paste.content, 200, "text/html");
          case "json":
          default:
            return setResponse(JSON.stringify({
              title: paste.title,
              content: paste.content,
              key: paste.key,
              syntax: paste.syntax,
              expiresAt: paste.expiresAt,
              createdAt: paste.createdAt,
              updatedAt: paste.updatedAt
            }), 200, "application/json");
        }
      case "update": {
        if (!key) {
          return setResponse(JSON.stringify({
            error: "Key is required to update paste"
          }), 400, "application/json");
        }
        const patch = { updatedAt: new Date() };
        if (title !== undefined) {
          if (!String(title).trim()) return setResponse(JSON.stringify({ error: "Title cannot be empty" }), 400, "application/json");
          patch.title = title;
        }
        if (content !== undefined) {
          if (!String(content).length) return setResponse(JSON.stringify({ error: "Content cannot be empty" }), 400, "application/json");
          patch.content = content;
        }
        if (syntax !== undefined) patch.syntax = syntax || "text";
        if (expireIn !== undefined) {
          const sec = parseInt(expireIn, 10);
          patch.expiresAt = sec > 0 ? new Date(Date.now() + sec * 1e3) : null;
        }
        const updated = await Paste.findOneAndUpdate({ key }, patch, { new: true, runValidators: true });
        if (!updated) {
          return setResponse(JSON.stringify({ error: "Paste not found" }), 404, "application/json");
        }
        return setResponse(JSON.stringify({
          title: updated.title,
          content: updated.content,
          key: updated.key,
          syntax: updated.syntax,
          expiresAt: updated.expiresAt,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }), 200, "application/json");
      }
      case "delete":
        if (!key) {
          const errorMessage = {
            error: "Key is required to delete paste"
          };
          return isRaw ? setResponse("Key is required to delete paste", 400, "text/plain") : requestedOutput === "text" ? setResponse("Key is required to delete paste", 400, "text/plain") : setResponse(JSON.stringify(errorMessage), 400, "application/json");
        }
        const pasteToDelete = await Paste.findOneAndDelete({
          key: key
        });
        if (!pasteToDelete) {
          const notFoundMessage = {
            error: "Paste not found"
          };
          return isRaw ? setResponse("Paste not found", 404, "text/plain") : requestedOutput === "text" ? setResponse("Paste not found", 404, "text/plain") : setResponse(JSON.stringify(notFoundMessage), 404, "application/json");
        }
        const deleteSuccessMessage = {
          message: `Paste with key ${key} has been deleted`
        };
        return isRaw ? setResponse(`Paste with key ${key} has been deleted`, 200, "text/plain") : requestedOutput === "text" ? setResponse(`Paste with key ${key} has been deleted`, 200, "text/plain") : setResponse(JSON.stringify(deleteSuccessMessage), 200, "application/json");
      case "clear":
        if (!adminKey || adminKey !== apiConfig.PASSWORD) {
          return setResponse(JSON.stringify({
            error: "adminKey is required to clear all pastes"
          }), 403, "application/json");
        }
        await Paste.deleteMany({});
        const clearSuccessMessage = {
          message: "All pastes have been cleared"
        };
        return isRaw ? setResponse("All pastes have been cleared", 200, "text/plain") : requestedOutput === "text" ? setResponse("All pastes have been cleared", 200, "text/plain") : setResponse(JSON.stringify(clearSuccessMessage), 200, "application/json");
      case "list":
        // Tanpa `page` → perilaku lama (array, maks 500). Dengan `page` → terpaginasi + pencarian `q`.
        if (req.query.page === undefined) {
          const allPastes = await Paste.find({}).sort({ createdAt: -1 }).limit(500).lean();
          return setResponse(JSON.stringify(allPastes), 200, "application/json");
        }
        {
          const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
          const qStr = String(req.query.q || "").trim().slice(0, 100);
          const filter = {};
          if (qStr) {
            const rx = { $regex: qStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
            filter.$or = [{ title: rx }, { key: rx }, { syntax: rx }, { content: rx }];
          }
          const total = await Paste.countDocuments(filter);
          const pages = Math.max(1, Math.ceil(total / limit));
          const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1));
          // Isi dipotong 600 karakter agar daftar tetap ringan; isi penuh lewat action=get.
          const items = await Paste.aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _id: 0, key: 1, title: 1, syntax: 1, expiresAt: 1, createdAt: 1, updatedAt: 1, length: { $strLenCP: "$content" }, content: { $substrCP: ["$content", 0, 600] } } }
          ]);
          return setResponse(JSON.stringify({ items, total, page, pages, limit }), 200, "application/json");
        }
      default:
        const invalidActionMessage = {
          error: "Invalid action"
        };
        return isRaw ? setResponse("Invalid action", 400, "text/plain") : requestedOutput === "text" ? setResponse("Invalid action", 400, "text/plain") : setResponse(JSON.stringify(invalidActionMessage), 400, "application/json");
    }
  } catch (error) {
    console.error("[PASTE]", error?.message);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}

export default withApiLog(withRateLimit(handler));
