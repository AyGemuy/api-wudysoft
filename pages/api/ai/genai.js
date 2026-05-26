import axios from "axios";
const BASE = "http://87.228.63.134";
const UA = "okhttp/4.12.0";
const POLL_MAX = 60;
const POLL_INTERVAL = 3e3;
class GenAI {
  constructor() {
    this.userId = null;
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json"
      }
    });
  }
  async auth() {
    if (this.userId) return this.userId;
    console.log("[auth] registering new user…");
    try {
      const {
        data
      } = await this.http.post("/register_user_req");
      this.userId = data?._id ?? null;
      console.log("[auth] userId:", this.userId, "| coins:", data?.coins);
      return this.userId;
    } catch (e) {
      console.error("[auth] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async info() {
    const user_id = await this.auth();
    console.log("[info] fetching user info…");
    try {
      const {
        data
      } = await this.http.post("/get_user_info_req", {
        user_id: user_id
      });
      console.log("[info] coins:", data?.coins);
      return data;
    } catch (e) {
      console.error("[info] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async poll(process_name) {
    console.log("[poll] process:", process_name);
    for (let i = 1; i <= POLL_MAX; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
      try {
        const {
          data
        } = await this.http.post("/get_result_req", {
          process_name: process_name
        });
        console.log(`[poll] attempt ${i}/${POLL_MAX} status: ${data?.status}`);
        if (data?.status === "success") return data;
      } catch (e) {
        console.warn(`[poll] attempt ${i} error:`, e?.response?.data ?? e.message);
      }
    }
    throw new Error(`[poll] timeout after ${POLL_MAX} attempts for ${process_name}`);
  }
  resolveMedia(media) {
    if (!media) return null;
    if (Buffer.isBuffer(media)) {
      console.log("[media] converting Buffer → base64");
      return `data:application/octet-stream;base64,${media.toString("base64")}`;
    }
    console.log("[media] using media as-is (url/base64)");
    return media;
  }
  async generate({
    mode = "video",
    prompt,
    media,
    ...rest
  }) {
    await this.auth();
    const user_id = this.userId;
    const resolvedMedia = this.resolveMedia(media);
    console.log(`[generate] mode=${mode} prompt="${prompt ?? ""}"`);
    if (mode === "scene") return this.genScene({
      prompt: prompt,
      user_id: user_id,
      ...rest
    });
    if (mode === "image") return this.genImage({
      prompt: prompt,
      media: resolvedMedia,
      user_id: user_id,
      ...rest
    });
    return this.genVideo({
      prompt: prompt,
      media: resolvedMedia,
      user_id: user_id,
      ...rest
    });
  }
  async genScene({
    prompt,
    user_id,
    duration = 5,
    ...rest
  }) {
    console.log("[scene] creating scenes…");
    try {
      const body = {
        duration: duration,
        user_id: user_id,
        user_topic: prompt ?? rest.user_topic,
        ...rest
      };
      const {
        data
      } = await this.http.post("/create_scenes_req", body);
      console.log("[scene] process_name:", data?.process_name);
      return this.poll(data?.process_name);
    } catch (e) {
      console.error("[scene] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async genImage({
    prompt,
    media,
    user_id,
    orientation = "9:16",
    scenes,
    persons,
    persons_url,
    ...rest
  }) {
    console.log("[image] creating images…");
    try {
      const sceneList = scenes ?? [{
        duration_seconds: rest.duration_seconds ?? 5,
        image_prompt: prompt ?? "",
        ...persons?.length && {
          persons: persons
        },
        ...persons_url?.length && {
          persons_url: persons_url
        },
        ...media && !persons_url?.length && {
          persons_url: [media]
        },
        timecode: rest.timecode ?? "0:00-0:05",
        video_prompt: rest.video_prompt ?? "",
        voiceover_text: rest.voiceover_text ?? ""
      }];
      const body = {
        orientation: orientation,
        scenes: sceneList,
        user_id: user_id
      };
      const {
        data
      } = await this.http.post("/create_all_images_req", body);
      console.log("[image] process_name:", data?.process_name);
      return this.poll(data?.process_name);
    } catch (e) {
      console.error("[image] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async genVideo({
    prompt,
    media,
    user_id,
    orientation = "9:16",
    resolution = "480p",
    scenes,
    persons,
    ...rest
  }) {
    if (persons) return this.genPersonVideo({
      prompt: prompt,
      media: media,
      user_id: user_id,
      orientation: orientation,
      scenes: scenes,
      persons: persons,
      ...rest
    });
    console.log("[video] creating video…");
    try {
      const sceneList = scenes ?? [{
        duration_seconds: rest.duration_seconds ?? 5,
        image_prompt: rest.image_prompt ?? "",
        ...(media || rest.image_url) && {
          image_url: media ?? rest.image_url
        },
        timecode: rest.timecode ?? "0:00-0:05",
        video_prompt: prompt ?? "",
        voiceover_text: rest.voiceover_text ?? ""
      }];
      const body = {
        model_video_nn: rest.model ?? "seedance-1-5-pro-251215",
        orientation: orientation,
        resolution: resolution,
        scenes: sceneList,
        sound: rest.sound ?? 1,
        user_id: user_id
      };
      const {
        data
      } = await this.http.post("/create_all_videos_req", body);
      console.log("[video] process_name:", data?.process_name);
      return this.poll(data?.process_name);
    } catch (e) {
      console.error("[video] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async genPersonVideo({
    prompt,
    media,
    user_id,
    orientation = "9:16",
    scenes,
    persons,
    ...rest
  }) {
    console.log("[persons] creating person-based video…");
    try {
      const sceneList = scenes ?? [{
        duration_seconds: rest.duration_seconds ?? 5,
        image_prompt: rest.image_prompt ?? "",
        persons: Object.keys(persons),
        timecode: rest.timecode ?? "0:00-0:05",
        video_prompt: prompt ?? "",
        voiceover_text: rest.voiceover_text ?? ""
      }];
      const body = {
        orientation: orientation,
        persons: persons,
        scenes: sceneList,
        user_id: user_id
      };
      const {
        data
      } = await this.http.post("/create_all_persons_req", body);
      console.log("[persons] process_name:", data?.process_name);
      return this.poll(data?.process_name);
    } catch (e) {
      console.error("[persons] error:", e?.response?.data ?? e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new GenAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}