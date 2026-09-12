import axios from "axios";
class GameChecker {
  constructor() {
    this.key = "35c9046f7cmshd2db25369e25f75p1cf84ejsn4d95e7ba9240";
    this.host = "id-game-checker.p.rapidapi.com";
  }
  async check({
    uid,
    zone,
    ...rest
  }) {
    const id = uid || "600222816";
    const server = zone ? zone : "10085";
    const options = {
      method: "GET",
      url: `https://${this.host}/mobile-legends/${id}/${server}`,
      headers: {
        "x-rapidapi-key": this.key,
        "x-rapidapi-host": this.host
      },
      params: {
        ...rest
      }
    };
    console.log(`[PROCESS] Checking ID: ${id} Zone: ${server}...`);
    try {
      const response = await axios.request(options);
      const result = response?.data?.data || response?.data;
      console.log("[SUCCESS] Data retrieved:", result?.username || "No Name");
      return result;
    } catch (error) {
      console.error("[ERROR]", error?.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid || !params.zone) {
    return res.status(400).json({
      error: "Parameter 'uid' dan 'zone' diperlukan"
    });
  }
  const api = new GameChecker();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}