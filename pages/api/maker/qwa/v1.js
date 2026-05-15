import axios from "axios";
class Qwa {
  constructor() {
    this.u = "https://qwa.eeq.my.id/api/generate";
  }
  _s(v) {
    return Buffer.isBuffer(v) ? `data:image/png;base64,${v.toString("base64")}` : v || "";
  }
  _l(m) {
    console.log(`[LOG] ${m}`);
  }
  async generate({
    message,
    ...rest
  }) {
    this._l("Menyiapkan payload...");
    try {
      const payload = {
        sender_name: rest?.sender_name || `User-${Math.floor(Math.random() * 1e3)}`,
        message: message || `Sent at ${new Date().toISOString()}`,
        ...rest?.sender_number && {
          sender_number: rest.number
        },
        ...rest?.sender_avatar && {
          sender_avatar: this._s(rest.sender_avatar)
        },
        ...rest?.sender_image && {
          sender_image: this._s(rest.sender_image)
        },
        ...rest?.time && {
          time: rest.time
        },
        ...rest?.background !== undefined && {
          background: rest.background
        },
        ...rest?.quoted && {
          quoted: {
            ...rest.quoted,
            image: this._s(rest.quoted?.image)
          }
        }
      };
      this._l(`Mengirim data ke API untuk: ${payload.sender_name}`);
      const {
        data,
        headers
      } = await axios.post(this.u, payload, {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/json"
        }
      });
      this._l("Berhasil menerima respons data.");
      return {
        buffer: Buffer.from(data),
        contentType: headers["content-type"] || "image/png"
      };
    } catch (e) {
      this._l(`Error: ${e?.response?.data ? Buffer.from(e.response.data).toString() : e.message}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.message) {
    return res.status(400).json({
      error: "Parameter 'message' diperlukan"
    });
  }
  try {
    const api = new Qwa();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}