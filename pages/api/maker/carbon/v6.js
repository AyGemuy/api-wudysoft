import axios from "axios";
class Carbon {
  constructor() {
    this.api = "https://api.microlink.io";
    this.themes = ["dracula-pro", "seti", "one-light", "one-dark", "verminal", "night-owl", "nord", "synthwave-84", "3024-night", "blackboard", "base16-dark", "base16-light", "cobalt", "duotone-dark", "hopscotch", "lucario", "material", "monokai", "oceanic-next", "panda-syntax", "paraiso-dark", "solarized", "twilight", "yeti", "zenburn"];
    this.fonts = ["Fira Code", "Monoid", "Fantasque Sans Mono", "Hack", "JetBrains Mono", "Cascadia Code", "IBM Plex Mono", "Anonymous Pro", "Droid Sans Mono", "Inconsolata", "Source Code Pro", "Ubuntu Mono", "Space Mono"];
  }
  check(type, val) {
    const list = type === "theme" ? this.themes : this.fonts;
    const valid = list.includes(val);
    if (!valid && val) console.log(`[Carbon] Warning: Invalid ${type} '${val}', using default.`);
    return valid ? val : type === "theme" ? "dracula-pro" : "Fira Code";
  }
  async generate({
    code,
    theme,
    font,
    ...rest
  }) {
    try {
      console.log("[Carbon] Generating snippet...");
      const t = this.check("theme", theme);
      const fm = this.check("font", font);
      const carbonOpts = {
        code: code || 'console.log("No code provided");',
        t: t,
        fm: fm,
        bg: rest.bg || "rgba(226,233,239,1)",
        wt: "none",
        l: "auto",
        ds: false,
        dsyoff: "20px",
        dsblur: "68px",
        wc: true,
        wa: true,
        pv: "56px",
        ph: "56px",
        ln: true,
        fl: 1,
        fs: "14px",
        lh: "152%",
        si: false,
        es: "2x",
        wm: false
      };
      const targetUrl = `https://carbon.now.sh/?${new URLSearchParams(carbonOpts).toString()}`;
      const {
        data: micro
      } = await axios.get(this.api, {
        params: {
          url: targetUrl,
          screenshot: true,
          waitUntil: "networkidle0",
          element: ".export-container"
        }
      });
      const imgUrl = micro?.data?.screenshot?.url;
      if (!imgUrl) throw new Error("Microlink failed to screenshot");
      console.log("[Carbon] Fetching image buffer...");
      const res = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "image/png";
      return {
        success: true,
        buffer: Buffer.from(res.data),
        contentType: contentType
      };
    } catch (e) {
      console.error(`[Carbon] Error: ${e.response?.data?.message || e.message}`);
      return {
        error: true,
        message: e?.response?.data?.toString() || e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  try {
    const api = new Carbon();
    const result = await api.generate(params);
    if (result.error) {
      console.error("API Error:", result.message);
      return res.status(result.status || 500).json({
        error: "Gagal memproses gambar",
        details: result.message
      });
    }
    const finalContentType = result.contentType || "image/png";
    res.setHeader("Content-Type", finalContentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}