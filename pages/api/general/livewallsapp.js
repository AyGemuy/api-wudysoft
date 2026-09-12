import axios from "axios";
import xml2js from "xml2js";
class Wallpapers {
  constructor() {
    this.base = "https://cdn.livewallsapp.com/";
  }
  fmt(b) {
    if (!b) return "0 B";
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(2)} ${i ? "KMGPTY"[i - 1] + "B" : "B"}`;
  }
  async get(options = {}) {
    const random = options.random || false;
    const limit = options.limit ?? null;
    console.log("🔄 Fetching S3 XML bucket data...");
    try {
      const {
        data
      } = await axios.get(this.base);
      const res = await new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: true
      }).parseStringPromise(data);
      const arr = [].concat(res?.ListBucketResult?.Contents || []);
      console.log(`📦 Found ${arr.length} raw entries in S3 Bucket.`);
      let raw = [],
        jsons = [];
      for (const i of arr) {
        if (!i?.Key || i.Key.endsWith("/")) continue;
        if (i.Key.endsWith(".json")) {
          jsons.push(this.base + i.Key);
        } else {
          raw.push({
            url: this.base + i.Key,
            time: i.LastModified,
            size: this.fmt(Number(i.Size))
          });
        }
      }
      console.log(`📂 Processing: ${raw.length} direct files, ${jsons.length} JSON indexes discovered.`);
      for (const url of jsons) {
        try {
          console.log(`📥 Fetching external list from: ${url}`);
          const {
            data: jData
          } = await axios.get(url);
          const items = Array.isArray(jData) ? jData : jData?.result || [];
          let validItemsCount = 0;
          for (const item of items) {
            if (item?.url) {
              raw.push({
                url: item.url,
                time: item?.time || new Date().toISOString(),
                size: item?.size || "0 B"
              });
              validItemsCount++;
            }
          }
          console.log(`✅ Successfully extracted ${validItemsCount} items from JSON.`);
        } catch (err) {
          console.error(`❌ Failed fetching JSON: ${url} ->`, err.message);
        }
      }
      console.log("🧼 Cleaning up data and removing duplicates...");
      const seen = new Set();
      let list = raw.filter(i => !seen.has(i.url) && seen.add(i.url));
      if (random) {
        console.log("🎲 Randomizing result list...");
        list = list.sort(() => Math.random() - .5);
      }
      if (limit && typeof limit === "number") {
        console.log(`✂️ Limiting output to ${limit} items.`);
        list = list.slice(0, limit);
      }
      console.log(`🎉 Done! Total items returned: ${list.length}`);
      return {
        count: list.length,
        result: list
      };
    } catch (err) {
      console.error("❌ Error main process:", err.message);
      return {
        count: 0,
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Wallpapers();
  try {
    const data = await api.get(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}