import axios from "axios";
import * as cheerio from "cheerio";
class KbbiScraper {
  constructor() {
    try {
      this.client = axios.create({
        baseURL: "https://kbbi.co.id",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
          referer: "https://kbbi.co.id/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 6e4
      });
    } catch (error) {
      console.log(`[Process] Gagal menginisialisasi instansi kelas: ${error?.message || error}`);
    }
  }
  parseSidebar($) {
    try {
      const kosakataPopuler = $(".panel:contains('Kosakata Populer'), .panel-primary:contains('Kosakata Populer')").find(".list-kata a").map((_, el) => ({
        kata: $(el).text().trim(),
        link: $(el).attr("href") || "",
        definisi_singkat: $(el).attr("title") || ""
      })).get();
      const sedangDilihat = $(".panel:contains('Sedang Dilihat'), .panel-primary:contains('Sedang Dilihat')").find(".list-kata a").map((_, el) => ({
        kata: $(el).text().trim(),
        link: $(el).attr("href") || "",
        definisi_singkat: $(el).attr("title") || ""
      })).get();
      const statistik = {};
      $(".kbbi-stat-item").each((_, el) => {
        const number = $(el).find(".kbbi-stat-number").text().trim();
        const label = $(el).find(".kbbi-stat-label").text().trim().toLowerCase().replace(/\s+/g, "_");
        if (label && number) {
          statistik[label] = number;
        }
      });
      return {
        kosakata_populer: kosakataPopuler,
        sedang_dilihat: sedangDilihat,
        statistik_kbbi: statistik
      };
    } catch (error) {
      console.log(`[Process] Gagal mengurai sidebar: ${error?.message || error}`);
      return {
        kosakata_populer: [],
        sedang_dilihat: [],
        statistik_kbbi: {}
      };
    }
  }
  prs(html) {
    try {
      const $ = cheerio.load(html || "");
      const mainContent = $(".col-md-8");
      if (!mainContent.length) return null;
      const h2Arti = mainContent.find("h2.arti").first();
      if (!h2Arti.length) return null;
      const cleanHeader = h2Arti.clone();
      cleanHeader.find("button").remove();
      const kataAsli = cleanHeader.text().trim();
      const audioBtn = h2Arti.find("button.audio-btn-small");
      let audioData = null;
      if (audioBtn.length) {
        const onClickAttr = audioBtn.attr("onclick") || "";
        const match = onClickAttr.match(/playAudio\('(.*?)'\)/);
        if (match && match[1]) {
          const textSpeech = match[1];
          audioData = {
            kata: textSpeech,
            url_alternatif_tts: `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(textSpeech)}`
          };
        }
      }
      const artiDiv = mainContent.find("div.arti").first();
      const htmlDefinisi = artiDiv.html()?.trim() || "";
      const teksDefinisi = artiDiv.text()?.trim() || "";
      const lafalMatch = teksDefinisi.match(/\/([^/]+)\//);
      const lafal = lafalMatch ? `/${lafalMatch[1]}/` : "";
      const kelasKata = artiDiv.find("i, em").map((_, el) => $(el).text().trim()).get().filter(val => val && val.length <= 5);
      const contohKalimat = $("#contoh-kalimat-section .contoh-item").map((_, el) => $(el).find(".contoh-text").text().trim()).get().filter(Boolean);
      let artikel = null;
      const artikelSec = $("#artikel-content");
      if (artikelSec.length) {
        artikel = {
          judul: artikelSec.find("h4").first().text().trim() || "",
          konten: artikelSec.find(".artikel-text").text().trim() || artikelSec.text().trim()
        };
      }
      return {
        kata_asli: kataAsli,
        lafal: lafal,
        html_definisi: htmlDefinisi,
        teks_definisi: teksDefinisi,
        kelas_kata: [...new Set(kelasKata)],
        contoh_penggunaan: contohKalimat,
        artikel_terkait: artikel,
        audio: audioData
      };
    } catch (error) {
      console.log(`[Process] Gagal mengurai elemen detail HTML: ${error?.message || error}`);
      return null;
    }
  }
  async search({
    query,
    limit
  }) {
    console.log("[Process] Memulai pencarian indeks kata...");
    try {
      const targetQuery = query ? query.trim() : "enteng";
      const maxLimit = limit ? parseInt(limit, 10) : 5;
      const encodedQuery = encodeURIComponent(targetQuery.toLowerCase());
      const searchPath = `/cari?kata=${encodedQuery}`;
      console.log(`[Process] Request ke halaman pencarian: ${searchPath}`);
      const searchResponse = await this.client.get(searchPath);
      const $ = cheerio.load(searchResponse.data);
      const metadataSidebar = this.parseSidebar($);
      if ($(".col-md-8 h2.arti").length) {
        console.log("[Process] Dialihkan langsung ke halaman detail.");
        const parsed = this.prs(searchResponse.data);
        return {
          status: true,
          query: targetQuery,
          total_hasil: 1,
          results: parsed ? [parsed] : [],
          metadata: metadataSidebar
        };
      }
      const detailLinks = $(".col-sm-9 h2 a").map((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          return href.startsWith("http") ? href : `https://kbbi.co.id${href}`;
        }
        return null;
      }).get().filter(Boolean);
      const limitedLinks = detailLinks.slice(0, maxLimit);
      console.log(`[Process] Ditemukan ${detailLinks.length} tautan detail kata. Memproses ${limitedLinks.length} kata.`);
      const results = [];
      for (const link of limitedLinks) {
        try {
          console.log(`[Process] Mengakses detail: ${link}`);
          const detailResponse = await this.client.get(link);
          const parsedDetail = this.prs(detailResponse.data);
          if (parsedDetail) {
            results.push(parsedDetail);
          }
        } catch (err) {
          console.log(`[Process] Gagal memproses link ${link}: ${err?.message || err}`);
        }
      }
      return {
        status: results.length > 0,
        query: targetQuery,
        total_hasil: results.length,
        results: results,
        metadata: metadataSidebar
      };
    } catch (error) {
      console.log(`[Process] Error pada metode search: ${error?.message || error}`);
      return {
        status: false,
        result: {
          pesan_error: error?.message || "Gagal memproses pencarian karena gangguan teknis"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new KbbiScraper();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan saat memproses."
    });
  }
}