import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import connectMongo from "@/lib/mongoose";
import Code from "@/models/CodeShare";
import apiConfig from "@/configs/apiConfig";
async function handler(req, res) {
  try {
    await connectMongo();
    switch (req.method) {
      case "GET": {
        const {
          search,
          tag,
          sortBy,
          id
        } = req.query;
        let filter = {};
        if (id) {
          filter._id = id;
        } else {
          if (search) {
            filter.fileName = {
              $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i"
            };
          }
          if (tag) {
            filter.tag = tag;
          }
        }
        const SORTABLE = ["createdAt", "likes", "views", "dislikes", "fileName"];
        const sort = {
          [SORTABLE.includes(sortBy) ? sortBy : "createdAt"]: -1,
          _id: -1
        };
        // Dengan `page` → terpaginasi {items,total,page,pages,limit}. Tanpa `page` → array lama (maks 300).
        if (req.query.page === undefined || id) {
          const codes = await Code.find(filter).sort(sort).limit(300).lean();
          return res.status(200).json(codes);
        }
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
        const total = await Code.countDocuments(filter);
        const pages = Math.max(1, Math.ceil(total / limit));
        const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1));
        const items = await Code.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean();
        return res.status(200).json({ items, total, page, pages, limit });
      }
      case "POST": {
        const {
          author,
          fileName,
          code,
          tag
        } = req.body;
        if (!author || !fileName || !code) {
          return res.status(400).json({
            message: "Missing required fields: author, fileName, or code!"
          });
        }
        const newCode = new Code({
          author: author,
          fileName: fileName,
          code: code,
          tag: tag || "Unknown",
          likes: 0,
          dislikes: 0,
          views: 0
        });
        await newCode.save();
        return res.status(201).json({
          message: "Code shared successfully!",
          code: newCode
        });
      }
      case "PUT": {
        const {
          id,
          action
        } = req.body;
        if (!id || !action) {
          return res.status(400).json({
            message: "Missing required fields: id and action!"
          });
        }
        let updateQuery = {};
        switch (action) {
          case "like":
            updateQuery = {
              $inc: {
                likes: 1
              }
            };
            break;
          case "dislike":
            updateQuery = {
              $inc: {
                dislikes: 1
              }
            };
            break;
          case "view":
            updateQuery = {
              $inc: {
                views: 1
              }
            };
            break;
          default:
            return res.status(400).json({
              message: "Invalid action! Valid actions are 'like', 'dislike', or 'view'."
            });
        }
        const updatedCode = await Code.findByIdAndUpdate(id, updateQuery, {
          new: true
        });
        if (!updatedCode) {
          return res.status(404).json({
            message: "Code not found!"
          });
        }
        return res.status(200).json({
          message: `${action} updated successfully!`,
          code: updatedCode
        });
      }
      case "DELETE": {
        const {
          id
        } = req.body;
        if (id) {
          const deletedCode = await Code.findByIdAndDelete(id);
          if (!deletedCode) {
            return res.status(404).json({
              message: "Code not found!"
            });
          }
          return res.status(200).json({
            message: "Code deleted successfully!"
          });
        } else {
          // hapus massal hanya untuk admin (adminKey = PASSWORD di configs/apiConfig.cjs)
          if (!req.body?.adminKey || req.body.adminKey !== apiConfig.PASSWORD) {
            return res.status(403).json({ message: "adminKey is required to clear all codes!" });
          }
          await Code.deleteMany({});
          return res.status(200).json({
            message: "All codes cleared!"
          });
        }
      }
      default:
        return res.status(405).json({
          message: "Method Not Allowed"
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));
