import axios from "axios";
import FormData from "form-data";
class Generator {
  constructor() {
    this.client = axios.create({
      baseURL: "http://175.155.64.171:31610/generate",
      timeout: 6e4,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      }
    });
    this.styles = [{
      name: "Mermaid 1",
      id: "87"
    }, {
      name: "Mermaid 2",
      id: "88"
    }, {
      name: "Mermaid 3",
      id: "89"
    }, {
      name: "Mermaid 4",
      id: "90"
    }, {
      name: "Mermaid 5",
      id: "91"
    }, {
      name: "Chinese traditional gorgeous suit",
      id: "3"
    }, {
      name: "Hanfu",
      id: "7"
    }, {
      name: "Cheongsam",
      id: "16"
    }, {
      name: "Chinese New Year Style",
      id: "17"
    }, {
      name: "Chinese winter hanfu",
      id: "18"
    }, {
      name: "Dunhuang",
      id: "26"
    }, {
      name: "GuoFeng Style",
      id: "35"
    }, {
      name: "Kimono Style",
      id: "40"
    }, {
      name: "Miao style",
      id: "47"
    }, {
      name: "Mongolian",
      id: "49"
    }, {
      name: "Tibetan clothing style",
      id: "63"
    }, {
      name: "Traditional chinese style",
      id: "64"
    }, {
      name: "ZangZu Style",
      id: "73"
    }, {
      name: "Zhuang style",
      id: "74"
    }, {
      name: "Casual Lifestyle",
      id: "2"
    }, {
      name: "T-shirt",
      id: "11"
    }, {
      name: "Working suit",
      id: "12"
    }, {
      name: "Fashion glasses",
      id: "31"
    }, {
      name: "Gentleman style",
      id: "34"
    }, {
      name: "Hiphop style",
      id: "36"
    }, {
      name: "Jacket in Snow Mountain",
      id: "39"
    }, {
      name: "Men's Suit",
      id: "46"
    }, {
      name: "Model style",
      id: "48"
    }, {
      name: "School uniform",
      id: "59"
    }, {
      name: "Street style",
      id: "62"
    }, {
      name: "Barbie Doll",
      id: "1"
    }, {
      name: "Elegant Princess",
      id: "5"
    }, {
      name: "Gown",
      id: "6"
    }, {
      name: "Innocent Girl in White Dress",
      id: "8"
    }, {
      name: "Snow White",
      id: "10"
    }, {
      name: "Fairy style",
      id: "30"
    }, {
      name: "Gothic Lolita",
      id: "41"
    }, {
      name: "Lolita",
      id: "42"
    }, {
      name: "Flora Lolita",
      id: "43"
    }, {
      name: "Maid style",
      id: "44"
    }, {
      name: "Female role in Peking opera",
      id: "52"
    }, {
      name: "Princess costum",
      id: "54"
    }, {
      name: "Wedding dress",
      id: "67"
    }, {
      name: "Wedding dress 2",
      id: "68"
    }, {
      name: "Armor",
      id: "0"
    }, {
      name: "Cybernetics punk",
      id: "4"
    }, {
      name: "Pixy Girl",
      id: "9"
    }, {
      name: "Mechanical",
      id: "45"
    }, {
      name: "Roaming Astronaut",
      id: "58"
    }, {
      name: "Science fiction style",
      id: "60"
    }, {
      name: "Witch style",
      id: "71"
    }, {
      name: "Wizard of Oz",
      id: "72"
    }, {
      name: "Motorcycle race style",
      id: "50"
    }, {
      name: "Soccer Field",
      id: "61"
    }, {
      name: "Cowboy style",
      id: "22"
    }, {
      name: "West cowboy",
      id: "69"
    }, {
      name: "Wild west style",
      id: "70"
    }, {
      name: "Deer girl",
      id: "23"
    }, {
      name: "Autumn populus euphratica style",
      id: "13"
    }, {
      name: "Bleak autumn style",
      id: "14"
    }, {
      name: "Colorful rainbow style",
      id: "20"
    }, {
      name: "Cool tones",
      id: "21"
    }, {
      name: "Ocean",
      id: "25"
    }, {
      name: "Colourful Style",
      id: "27"
    }, {
      name: "European fields",
      id: "29"
    }, {
      name: "Flame Red Style",
      id: "32"
    }, {
      name: "Flowers",
      id: "33"
    }, {
      name: "Summer Ocean Vibe",
      id: "51"
    }, {
      name: "Red Style",
      id: "56"
    }, {
      name: "Sea World",
      id: "66"
    }, {
      name: "Cartoon",
      id: "15"
    }, {
      name: "Christmas",
      id: "19"
    }, {
      name: "Disneyland",
      id: "24"
    }, {
      name: "Polaroid style",
      id: "53"
    }, {
      name: "Rainy night",
      id: "55"
    }, {
      name: "Retro Style",
      id: "57"
    }, {
      name: "Tyndall Light",
      id: "65"
    }, {
      name: "Embroidery",
      id: "28"
    }, {
      name: "Comic Art 1",
      id: "75"
    }, {
      name: "Comic Art 2",
      id: "76"
    }, {
      name: "Comic Art 3",
      id: "77"
    }, {
      name: "Comic Art 4",
      id: "78"
    }, {
      name: "Comic Art 5",
      id: "79"
    }, {
      name: "Comic Art 6",
      id: "80"
    }, {
      name: "Indian 1",
      id: "81"
    }, {
      name: "Indian 2",
      id: "82"
    }, {
      name: "Indian 3",
      id: "83"
    }, {
      name: "Indian 4",
      id: "84"
    }, {
      name: "Indian 5",
      id: "85"
    }, {
      name: "Indian 6",
      id: "86"
    }, {
      name: "Mechanical 1",
      id: "92"
    }, {
      name: "Mechanical 2",
      id: "93"
    }, {
      name: "Mechanical 3",
      id: "94"
    }, {
      name: "Mechanical 4",
      id: "95"
    }, {
      name: "Mechanical 5",
      id: "96"
    }, {
      name: "Halloween 1",
      id: "97"
    }, {
      name: "Halloween 2",
      id: "98"
    }, {
      name: "Halloween 3",
      id: "99"
    }, {
      name: "Halloween 4",
      id: "100"
    }, {
      name: "Halloween 5",
      id: "101"
    }, {
      name: "Christmas 1",
      id: "107"
    }, {
      name: "Christmas 2",
      id: "108"
    }, {
      name: "Christmas 3",
      id: "109"
    }, {
      name: "Christmas 4",
      id: "110"
    }, {
      name: "Christmas 5",
      id: "111"
    }, {
      name: "Firework 1",
      id: "112"
    }, {
      name: "Firework 2",
      id: "113"
    }, {
      name: "Firework 3",
      id: "114"
    }, {
      name: "Firework 4",
      id: "115"
    }, {
      name: "Firework 5",
      id: "116"
    }, {
      name: "Rain 1",
      id: "102"
    }, {
      name: "Rain 2",
      id: "103"
    }, {
      name: "Rain 3",
      id: "104"
    }, {
      name: "Rain 4",
      id: "105"
    }, {
      name: "Rain 5",
      id: "106"
    }];
  }
  async resImg(img) {
    console.log("[Proses] Memproses input gambar...");
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[Proses] Gambar berupa Buffer.");
        return {
          data: img,
          name: "image.webp",
          contentType: "image/webp"
        };
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[Proses] Gambar berupa URL. Mendownload...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const contentType = res.headers["content-type"] || "image/webp";
          return {
            data: Buffer.from(res.data),
            name: "image.webp",
            contentType: contentType
          };
        }
        if (img.startsWith("data:image") || img.includes("base64,")) {
          console.log("[Proses] Gambar berupa Base64 Data URL.");
          const b64 = img.split(";base64,").pop();
          return {
            data: Buffer.from(b64, "base64"),
            name: "image.webp",
            contentType: "image/webp"
          };
        }
        console.log("[Proses] Gambar berupa Base64 murni.");
        return {
          data: Buffer.from(img, "base64"),
          name: "image.webp",
          contentType: "image/webp"
        };
      }
      return {
        error: "Format gambar tidak didukung."
      };
    } catch (e) {
      console.error("[Error resImg]", e.message);
      return {
        error: `Gagal memproses gambar: ${e.message}`
      };
    }
  }
  async generate({
    mode,
    image,
    style_idx,
    fidelity_weight,
    ...rest
  }) {
    console.log(`[Mulai] Generate mode: ${mode || "kosong"}`);
    try {
      if (!mode) return {
        status: 400,
        error: 'Input "mode" wajib diisi.'
      };
      if (!image) return {
        status: 400,
        error: 'Input "image" wajib diisi.'
      };
      const styleId = style_idx ? String(style_idx) : "87";
      const fidelityVal = fidelity_weight || "0.5";
      let matchedStyle = this.styles.find(s => s.id === styleId);
      if (!matchedStyle) {
        matchedStyle = {
          name: rest.style_name || `Style Custom (${styleId})`,
          id: styleId
        };
        this.styles.push(matchedStyle);
      }
      const solved = await this.resImg(image);
      if (solved?.error) return {
        status: 400,
        error: solved.error
      };
      const form = new FormData();
      form.append("file", solved.data, {
        filename: solved.name,
        contentType: solved.contentType
      });
      let endpoint = "";
      switch (mode) {
        case "aiart":
          endpoint = "/aiart";
          form.append("use_face_swap", "true");
          form.append("use_pose_model", "false");
          form.append("num_generate", "1");
          form.append("style_idx", styleId);
          form.append("multiplier_styles", "None");
          break;
        case "enhance":
          endpoint = "/enhance";
          form.append("fidelity_weight", fidelityVal);
          break;
        default:
          return {
            status: 400,
              error: `Mode "${mode}" tidak valid.`,
              available_styles: this.styles
          };
      }
      if (Object.keys(rest).length > 0) {
        console.log("[Proses] Override payload:", rest);
        Object.entries(rest).forEach(([k, v]) => {
          if (k !== "style_name") form.append(k, String(v));
        });
      }
      console.log(`[Proses] Mengirim POST ke endpoint ${endpoint}...`);
      const response = await this.client.post(endpoint, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("[Sukses] Response diterima.");
      const base64String = response.data?.images_base64?.[0] || response.data?.image_base64;
      if (!base64String) return {
        status: 500,
        error: "Gagal mendapatkan base64 gambar dari server."
      };
      return {
        status: response.status || 200,
        buffer: Buffer.from(base64String, "base64"),
        contentType: mode === "enhance" ? "image/png" : "image/webp"
      };
    } catch (error) {
      console.error("[Error]", error.message);
      return {
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new Generator();
  try {
    const data = await api.generate(params);
    if (data?.status >= 400 || data?.error) {
      return res.status(data.status || 400).json({
        error: data.error || "Gagal memproses request dari AI Client",
        ...data.available_styles && {
          available_styles: data.available_styles
        }
      });
    }
    res.setHeader("Content-Type", data?.contentType || "image/webp");
    return res.status(200).send(data.buffer);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan saat memproses request"
    });
  }
}