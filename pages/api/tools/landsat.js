import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Landsat {
  constructor() {
    this.BASE = "https://science.nasa.gov/specials/your-name-in-landsat/images/";
    this.BAD = ["asshole", "arsehole", "arse", "ass", "bitch", "bastard", "bollocks", "bullshit", "brotherfucker", "bugger", "cock", "cocksucker", "cunt", "cabron", "carajo", "chingar", "cono", "dickhead", "dumbass", "dyke", "fuck", "fucker", "fucking", "fag", "faggot", "goddamn", "goddammit", "goddamnit", "gilipollas", "horseshit", "jackass", "joder", "kike", "motherfucker", "mierda", "nigga", "nigger", "pussy", "penis", "puta", "pendejo", "piss", "slut", "shit", "shite", "twat", "whore"];
    this.MAX = {
      a: 4,
      b: 1,
      c: 2,
      d: 1,
      e: 3,
      f: 1,
      g: 0,
      h: 1,
      i: 4,
      j: 2,
      k: 1,
      l: 3,
      m: 2,
      n: 2,
      o: 1,
      p: 1,
      q: 1,
      r: 3,
      s: 2,
      t: 1,
      u: 2,
      v: 3,
      w: 1,
      x: 2,
      y: 2,
      z: 1
    };
    this.LOC = {
      a_0: {
        title: "Hickman, Kentucky",
        coord: "36°35'20.8 N 89°20'26.9 W"
      },
      a_1: {
        title: "Farm Island, Maine",
        coord: "45°43'43.8 N 69°46'08.9 W"
      },
      a_2: {
        title: "Aral Sea, Kazakhstan",
        coord: "45°20'12.1 N 59°38'05.4 E"
      },
      a_3: {
        title: "Adrar, Mauritania",
        coord: "20°31'04.2 N 13°04'12.4 W"
      },
      a_4: {
        title: "Al Jowf, Libya",
        coord: "24°12'01.2 N 23°18'22.1 E"
      },
      b_0: {
        title: "Bakhuis Mountains, Suriname",
        coord: "4°48'21.2 N 56°45'12.3 W"
      },
      b_1: {
        title: "Brahmaputra River, India",
        coord: "26°12'04.5 N 91°45'00.1 E"
      },
      c_0: {
        title: "Cape Cod, USA",
        coord: "41°41'01.2 N 70°12'11.1 W"
      },
      c_1: {
        title: "Caspian Sea, Kazakhstan",
        coord: "42°12'11.1 N 50°22'01.3 E"
      },
      c_2: {
        title: "Chubut, Argentina",
        coord: "43°45'01.2 S 66°22'11.3 W"
      },
      d_0: {
        title: "Danube Delta, Romania",
        coord: "45°12'11.2 N 29°22'01.3 E"
      },
      d_1: {
        title: "Death Valley, USA",
        coord: "36°14'11.2 N 116°49'01.1 W"
      },
      e_0: {
        title: "Erebus Ice Tongue, Antarctica",
        coord: "77°42'11.2 S 166°40'01.1 E"
      },
      e_1: {
        title: "Etosha Pan, Namibia",
        coord: "18°47'11.2 S 16°15'01.1 E"
      },
      e_2: {
        title: "Euphrates River, Syria",
        coord: "35°12'11.2 N 39°20'01.1 E"
      },
      e_3: {
        title: "Everglades, USA",
        coord: "25°20'11.2 N 80°50'01.1 W"
      },
      f_0: {
        title: "Falkland Islands",
        coord: "51°45'01.2 S 59°12'01.1 W"
      },
      f_1: {
        title: "Fraser Island, Australia",
        coord: "25°12'01.2 S 153°12'01.1 E"
      },
      g_0: {
        title: "Great Barrier Reef, Australia",
        coord: "18°17'11.2 S 147°42'01.1 E"
      },
      h_0: {
        title: "Himalayas, Nepal",
        coord: "28°35'11.2 N 84°12'01.1 E"
      },
      h_1: {
        title: "Hudson Bay, Canada",
        coord: "58°45'11.2 N 90°12'01.1 W"
      },
      i_0: {
        title: "Iberian Peninsula, Spain",
        coord: "40°12'11.2 N 3°45'01.1 W"
      },
      i_1: {
        title: "Indus River, Pakistan",
        coord: "24°12'11.2 N 67°45'01.1 E"
      },
      i_2: {
        title: "Isabela Island, Galapagos",
        coord: "0°45'11.2 S 91°12'01.1 W"
      },
      i_3: {
        title: "Iguazu Falls, Brazil",
        coord: "25°41'11.2 S 54°26'01.1 W"
      },
      i_4: {
        title: "Inland Delta, Mali",
        coord: "14°30'11.2 N 4°12'01.1 W"
      },
      j_0: {
        title: "James Bay, Canada",
        coord: "53°12'11.2 N 79°22'01.1 W"
      },
      j_1: {
        title: "Jebel Ali, UAE",
        coord: "24°59'11.2 N 55°02'01.1 E"
      },
      j_2: {
        title: "Jupiter, Florida",
        coord: "26°56'11.2 N 80°06'01.1 W"
      },
      k_0: {
        title: "Kalahari Desert, Botswana",
        coord: "23°12'11.2 S 23°30'01.1 E"
      },
      k_1: {
        title: "Krakatau, Indonesia",
        coord: "6°06'07.1 S 105°25'22.3 E"
      },
      l_0: {
        title: "Nusantara, Indonesia",
        coord: "0°58'18.1 S 116°41'58.9 E"
      },
      l_1: {
        title: "Lombok, Indonesia",
        coord: "8°33'54.2 S 116°21'04.1 E"
      },
      l_2: {
        title: "Lake Baikal, Russia",
        coord: "53°30'11.2 N 108°12'01.1 E"
      },
      l_3: {
        title: "Lena River Delta, Russia",
        coord: "72°45'11.2 N 126°30'01.1 E"
      },
      m_0: {
        title: "Mekong Delta, Vietnam",
        coord: "10°12'11.2 N 106°12'01.1 E"
      },
      m_1: {
        title: "Mississippi River, USA",
        coord: "29°12'11.2 N 89°22'01.1 W"
      },
      m_2: {
        title: "Mount Etna, Italy",
        coord: "37°45'11.2 N 14°59'01.1 E"
      },
      n_0: {
        title: "Nile River, Egypt",
        coord: "30°12'11.2 N 31°12'01.1 E"
      },
      n_1: {
        title: "Namib Desert, Namibia",
        coord: "24°45'11.2 S 15°12'01.1 E"
      },
      n_2: {
        title: "North Slope, Alaska",
        coord: "70°12'11.2 N 150°12'01.1 W"
      },
      o_0: {
        title: "Okavango Delta, Botswana",
        coord: "19°12'11.2 S 22°45'01.1 E"
      },
      o_1: {
        title: "Oman Coast",
        coord: "20°12'11.2 N 58°12'01.1 E"
      },
      p_0: {
        title: "Pantanal, Brazil",
        coord: "18°12'11.2 S 56°30'01.1 W"
      },
      p_1: {
        title: "Patagonia, Chile",
        coord: "50°12'11.2 S 73°12'01.1 W"
      },
      q_0: {
        title: "Qattara Depression, Egypt",
        coord: "30°00'11.2 N 27°30'01.1 E"
      },
      q_1: {
        title: "Mount Tambora, Indonesia",
        coord: "8°14'31.3 S 117°59'31.2 E"
      },
      r_0: {
        title: "Rio de Janeiro, Brazil",
        coord: "22°54'11.2 S 43°12'01.1 W"
      },
      r_1: {
        title: "Rub' al Khali, Saudi Arabia",
        coord: "20°12'11.2 N 50°12'01.1 E"
      },
      r_2: {
        title: "Rann of Kutch, India",
        coord: "23°45'11.2 N 70°12'01.1 E"
      },
      r_3: {
        title: "Rocky Mountains, USA",
        coord: "40°12'11.2 N 105°45'01.1 W"
      },
      s_0: {
        title: "Sahara Desert, Algeria",
        coord: "25°12'11.2 N 3°12'01.1 E"
      },
      s_1: {
        title: "Suez Canal, Egypt",
        coord: "29°59'11.2 N 32°33'01.1 E"
      },
      s_2: {
        title: "Siberia, Russia",
        coord: "60°12'11.2 N 100°12'01.1 E"
      },
      t_0: {
        title: "Tibet Plateau",
        coord: "32°12'11.2 N 85°12'01.1 E"
      },
      t_1: {
        title: "Taklamakan Desert, China",
        coord: "38°12'11.2 N 82°12'01.1 E"
      },
      u_0: {
        title: "Ural Mountains, Russia",
        coord: "60°12'11.2 N 60°12'01.1 E"
      },
      u_1: {
        title: "Uluru, Australia",
        coord: "25°20'11.2 S 131°02'01.1 E"
      },
      u_2: {
        title: "Usumacinta River, Mexico",
        coord: "17°12'11.2 N 91°12'01.1 W"
      },
      v_0: {
        title: "Victoria Falls, Zimbabwe",
        coord: "17°55'11.2 S 25°51'01.1 E"
      },
      v_1: {
        title: "Vesuvius, Italy",
        coord: "40°49'11.2 N 14°25'01.1 E"
      },
      v_2: {
        title: "Volga Delta, Russia",
        coord: "46°12'11.2 N 48°02'01.1 E"
      },
      v_3: {
        title: "Vancouver Island, Canada",
        coord: "49°30'11.2 N 125°30'01.1 W"
      },
      w_0: {
        title: "Wadden Sea, Netherlands",
        coord: "53°12'11.2 N 5°12'01.1 E"
      },
      w_1: {
        title: "Western Ghats, India",
        coord: "15°12'11.2 N 74°12'01.1 E"
      },
      x_0: {
        title: "Xingu River, Brazil",
        coord: "3°12'11.2 S 52°12'01.1 W"
      },
      x_1: {
        title: "Xuan Wei, China",
        coord: "26°12'11.2 N 104°12'01.1 E"
      },
      x_2: {
        title: "Xizang, China",
        coord: "30°12'11.2 N 90°12'01.1 E"
      },
      y_0: {
        title: "Yellow River, China",
        coord: "37°45'11.2 N 119°12'01.1 E"
      },
      y_1: {
        title: "Yucatan, Mexico",
        coord: "20°12'11.2 N 89°12'01.1 W"
      },
      y_2: {
        title: "Yukon Delta, Alaska",
        coord: "62°30'11.2 N 164°45'01.1 W"
      },
      z_0: {
        title: "Zambezi River, Zambia",
        coord: "15°45'11.2 S 28°12'01.1 E"
      },
      z_1: {
        title: "Zagros Mountains, Iran",
        coord: "32°12'11.2 N 50°12'01.1 E"
      }
    };
  }
  _buildHtml(letters) {
    const imgs = letters.map(l => `<img src="${l.url}" alt="${l.char}">`).join("");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;}.w{display:flex;width:fit-content;height:auto;line-height:0;}.w img{display:block;height:auto;max-width:100%;border:none;}</style></head><body><div class="w">${imgs}</div></body></html>`;
  }
  async _uploadHtml(html) {
    try {
      console.log("[UPLOAD] Mengirim HTML ke API...");
      const res = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/html2img/v20`, {
        html: html
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });
      console.log("[UPLOAD] Sukses, status:", res.status);
      return res.data;
    } catch (err) {
      console.error("[UPLOAD] Gagal:", err.message);
      if (err.response) console.error("Response data:", err.response.data);
      throw err;
    }
  }
  async generate({
    text,
    up = false
  }) {
    try {
      console.log("[GEN] Input text:", text);
      let input = text.replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").trim();
      if (!input) throw new Error("Input kosong setelah filter");
      console.log("[GEN] Filtered input:", input);
      const isBad = this.BAD.some(w => new RegExp(`\\b${w}\\b`, "i").test(input));
      if (isBad) {
        console.warn("[GEN] Kata terlarang terdeteksi");
        return null;
      }
      const pools = {};
      for (const [ch, max] of Object.entries(this.MAX)) {
        pools[ch] = Array.from({
          length: max + 1
        }, (_, i) => i);
      }
      const letters = [];
      for (const ch of input) {
        if (ch === " ") {
          letters.push({
            char: " ",
            url: null,
            location: null
          });
          continue;
        }
        const lower = ch.toLowerCase();
        let num;
        if (pools[lower] && pools[lower].length) {
          const rand = Math.floor(Math.random() * pools[lower].length);
          num = pools[lower].splice(rand, 1)[0];
        } else {
          num = Math.floor(Math.random() * (this.MAX[lower] + 1));
        }
        const id = `${lower}_${num}`;
        letters.push({
          char: lower,
          image: id,
          url: `${this.BASE}${id}.jpg`,
          location: this.LOC[id] || {
            title: "Global View",
            coordinates: "Landsat Satellite"
          }
        });
      }
      console.log("[GEN] Proses huruf selesai, total:", letters.length);
      const html = this._buildHtml(letters);
      let uploadResult = null;
      if (up) {
        uploadResult = await this._uploadHtml(html);
      }
      return {
        input: input,
        count: letters.length,
        letters: letters,
        html: html,
        upload: uploadResult
      };
    } catch (err) {
      console.error("[GEN] Error:", err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new Landsat();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}