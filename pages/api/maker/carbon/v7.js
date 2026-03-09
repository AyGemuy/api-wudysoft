import axios from "axios";
const themeIds = ["vercel", "rabbit", "supabase", "tailwind", "openai", "mintlify", "prisma", "clerk", "elevenlabs", "resend", "triggerdev", "nuxt", "browserbase", "cloudflare", "gemini", "stripe", "wrapped", "bitmap", "noir", "ice", "sand", "forest", "mono", "breeze", "candy", "crimson", "falcon", "meadow", "midnight", "raindrop", "sunset"];
const langIds = ["shell", "astro", "cpp", "csharp", "clojure", "console", "crystal", "css", "cypher", "dart", "diff", "dockerfile", "elm", "erb", "elixir", "erlang", "gleam", "graphql", "go", "hcl", "haskell", "html", "java", "javascript", "julia", "json", "jsx", "kotlin", "latex", "liquid", "lisp", "lua", "markdown", "matlab", "move", "plaintext", "powershell", "objectivec", "ocaml", "php", "prisma", "python", "r", "ruby", "rust", "scala", "scss", "solidity", "sql", "swift", "svelte", "toml", "typescript", "tsx", "v", "vue", "xml", "yaml", "zig"];
const paddingOptions = [16, 32, 64, 128];
class RaySo {
  async generate({
    code,
    theme = "nuxt",
    language = "",
    padding = 64,
    timeout = 6e4,
    ...rest
  }) {
    try {
      const validatedTheme = themeIds.includes(theme) ? theme : "nuxt";
      const validatedLang = langIds.includes(language) ? language : "";
      const validatedPadding = paddingOptions.includes(Number(padding)) ? padding : 64;
      const codeBase64 = Buffer.from(code).toString("base64");
      const params = new URLSearchParams({
        theme: validatedTheme,
        language: validatedLang,
        padding: validatedPadding.toString(),
        background: "true",
        darkMode: "true",
        code: codeBase64,
        ...rest
      });
      const raySoUrl = `https://ray.so/#${params.toString()}`;
      const microlinkResponse = await axios.get("https://api.microlink.io", {
        params: {
          url: raySoUrl,
          screenshot: true,
          waitUntil: "networkidle0",
          element: "#frame"
        },
        timeout: timeout
      });
      const result = microlinkResponse.data;
      if (result.status !== "success" || !result.data?.screenshot?.url) {
        throw new Error("Gagal mengambil screenshot dari Microlink");
      }
      const imageResponse = await axios.get(result.data.screenshot.url, {
        responseType: "arraybuffer",
        timeout: timeout
      });
      const contentType = imageResponse.headers["content-type"] || "image/png";
      return {
        success: true,
        buffer: Buffer.from(imageResponse.data),
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
    const api = new RaySo();
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