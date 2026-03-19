import axios from "axios";
class CloudflareAI {
  constructor() {
    this.account = "0f254e2970990ee7bc1b7478a4444c9b";
    this.token = "SglC5N4bnguqqGEoeWOQWPsSdEgGtDI0x3CyaSUf";
    this.base = `https://api.cloudflare.com/client/v4/accounts/${this.account}/ai`;
    this.http = axios.create({
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
  }
  async _img({
    input,
    ...rest
  }) {
    try {
      if (Buffer.isBuffer(input)) {
        console.log("[img] type=Buffer");
        return [...new Uint8Array(input)];
      }
      if (typeof input === "string" && input.startsWith("http")) {
        console.log(`[img] type=URL url=${input}`);
        const r = await axios.get(input, {
          responseType: "arraybuffer",
          ...rest
        });
        return [...new Uint8Array(r.data)];
      }
      if (typeof input === "string") {
        console.log("[img] type=base64");
        const b64 = input.includes(",") ? input.split(",")[1] : input;
        return [...new Uint8Array(Buffer.from(b64, "base64"))];
      }
      throw new Error("Unsupported image input type");
    } catch (e) {
      console.error(`[img] Error: ${e.message}`);
      throw e;
    }
  }
  _parseErr({
    e
  }) {
    try {
      const raw = e.response?.data;
      return raw ? JSON.parse(Buffer.from(raw).toString("utf8"))?.errors?.[0]?.message : null;
    } catch {
      return null;
    }
  }
  async run({
    model,
    body = {},
    ...rest
  }) {
    console.log(`[run] model=${model}`);
    try {
      const r = await this.http.post(`${this.base}/run/${model}`, body, {
        responseType: "arraybuffer",
        ...rest
      });
      const ct = r.headers?.["content-type"] || "";
      console.log(`[run] status=${r.status} content-type=${ct}`);
      if (ct.startsWith("image/") || ct === "application/octet-stream") {
        return {
          buffer: Buffer.from(r.data),
          contentType: ct
        };
      }
      const json = JSON.parse(Buffer.from(r.data).toString("utf8"));
      return json?.result ?? json;
    } catch (e) {
      const msg = this._parseErr({
        e: e
      }) || e.message;
      console.error(`[run] Error: ${msg}`);
      throw new Error(msg);
    }
  }
  async generate({
    prompt,
    model,
    image,
    ...rest
  }) {
    const mode = image ? "img2img" : "t2i";
    console.log(`[generate] mode=${mode} model=${model} prompt='${prompt}'`);
    try {
      const body = {
        prompt: prompt,
        ...rest
      };
      if (image) body.image = await this._img({
        input: image
      });
      return await this.run({
        model: model,
        body: body
      });
    } catch (e) {
      console.error(`[generate] Error: ${e.message}`);
      throw e;
    }
  }
  async models({
    search,
    task,
    author,
    source,
    hideExp,
    page = 1,
    perPage = 50,
    ...rest
  } = {}) {
    console.log(`[models] task=${task} search=${search} author=${author} page=${page}`);
    try {
      const r = await this.http.get(`${this.base}/models/search`, {
        params: {
          search: search || undefined,
          task: task || undefined,
          author: author || undefined,
          source: source || undefined,
          hide_experimental: hideExp ?? undefined,
          page: page,
          per_page: perPage,
          ...rest
        }
      });
      const list = r.data || [];
      console.log(`[models] found`);
      return list;
    } catch (e) {
      console.error(`[models] Error: ${e.message}`);
      throw e;
    }
  }
  async schema({
    model,
    ...rest
  }) {
    console.log(`[schema] model=${model}`);
    try {
      const r = await this.http.get(`${this.base}/models/schema`, {
        params: {
          model: model,
          ...rest
        }
      });
      console.log("[schema] ok");
      return r.data;
    } catch (e) {
      console.error(`[schema] Error: ${e.message}`);
      throw e;
    }
  }
  async tasks({
    ...rest
  } = {}) {
    console.log("[tasks]");
    try {
      const r = await this.http.get(`${this.base}/tasks`, {
        params: {
          ...rest
        }
      });
      const list = r.data || [];
      console.log(`[tasks] found`);
      return list;
    } catch (e) {
      console.error(`[tasks] Error: ${e.message}`);
      throw e;
    }
  }
  async authors({
    search,
    page = 1,
    perPage = 50,
    ...rest
  } = {}) {
    console.log(`[authors] search=${search} page=${page}`);
    try {
      const r = await this.http.get(`${this.base}/authors`, {
        params: {
          search: search || undefined,
          page: page,
          per_page: perPage,
          ...rest
        }
      });
      const list = r.data || [];
      console.log(`[authors] found`);
      return list;
    } catch (e) {
      console.error(`[authors] Error: ${e.message}`);
      throw e;
    }
  }
  async finetunes({
    ...rest
  } = {}) {
    console.log("[finetunes]");
    try {
      const r = await this.http.get(`${this.base}/finetunes`, {
        params: {
          ...rest
        }
      });
      const list = r.data || [];
      console.log(`[finetunes] found`);
      return list;
    } catch (e) {
      console.error(`[finetunes] Error: ${e.message}`);
      throw e;
    }
  }
  async get_finetune({
    id,
    ...rest
  }) {
    console.log(`[get_finetune] id=${id}`);
    try {
      const r = await this.http.get(`${this.base}/finetunes/${id}`, {
        params: {
          ...rest
        }
      });
      console.log("[get_finetune] ok");
      return r.data;
    } catch (e) {
      console.error(`[get_finetune] Error: ${e.message}`);
      throw e;
    }
  }
  async create_finetune({
    model,
    name,
    description,
    ...rest
  }) {
    console.log(`[create_finetune] model=${model} name=${name}`);
    try {
      const r = await this.http.post(`${this.base}/finetunes`, {
        model: model,
        name: name,
        description: description,
        ...rest
      });
      console.log(`[create_finetune] ok id=${r.data?.result?.id}`);
      return r.data;
    } catch (e) {
      console.error(`[create_finetune] Error: ${e.message}`);
      throw e;
    }
  }
  async update_finetune({
    id,
    name,
    description,
    ...rest
  }) {
    console.log(`[update_finetune] id=${id}`);
    try {
      const r = await this.http.put(`${this.base}/finetunes/${id}`, {
        name: name,
        description: description,
        ...rest
      });
      console.log("[update_finetune] ok");
      return r.data;
    } catch (e) {
      console.error(`[update_finetune] Error: ${e.message}`);
      throw e;
    }
  }
  async public_finetunes({
    page = 1,
    perPage = 50,
    ...rest
  } = {}) {
    console.log(`[public_finetunes] page=${page}`);
    try {
      const r = await this.http.get(`${this.base}/finetunes/public`, {
        params: {
          page: page,
          per_page: perPage,
          ...rest
        }
      });
      const list = r.data || [];
      console.log(`[public_finetunes] found=${list.length}`);
      return list;
    } catch (e) {
      console.error(`[public_finetunes] Error: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const ai = new CloudflareAI();
  const validActions = ["run", "generate", "models", "schema", "tasks", "authors", "finetunes", "get_finetune", "create_finetune", "update_finetune", "public_finetunes"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=models&task=Text-to-Image"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: ${action}.`,
      valid_actions: validActions
    });
  }
  try {
    let response;
    switch (action) {
      case "run":
        if (!params.model) return res.status(400).json({
          status: false,
          error: "Parameter 'model' wajib diisi."
        });
        response = await ai.run({
          model: params.model,
          body: params.body || {}
        });
        break;
      case "generate":
        if (!params.model) return res.status(400).json({
          status: false,
          error: "Parameter 'model' wajib diisi."
        });
        if (!params.prompt) return res.status(400).json({
          status: false,
          error: "Parameter 'prompt' wajib diisi."
        });
        response = await ai.generate(params);
        break;
      case "models":
        response = await ai.models(params);
        break;
      case "schema":
        if (!params.model) return res.status(400).json({
          status: false,
          error: "Parameter 'model' wajib diisi."
        });
        response = await ai.schema(params);
        break;
      case "tasks":
        response = await ai.tasks(params);
        break;
      case "authors":
        response = await ai.authors(params);
        break;
      case "finetunes":
        response = await ai.finetunes(params);
        break;
      case "get_finetune":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi."
        });
        response = await ai.get_finetune(params);
        break;
      case "create_finetune":
        if (!params.model) return res.status(400).json({
          status: false,
          error: "Parameter 'model' wajib diisi."
        });
        if (!params.name) return res.status(400).json({
          status: false,
          error: "Parameter 'name' wajib diisi."
        });
        response = await ai.create_finetune(params);
        break;
      case "update_finetune":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi."
        });
        response = await ai.update_finetune(params);
        break;
      case "public_finetunes":
        response = await ai.public_finetunes(params);
        break;
    }
    if (response?.buffer instanceof Buffer) {
      const ct = response.contentType || "image/png";
      res.setHeader("Content-Type", ct);
      res.setHeader("Content-Length", response.buffer.length);
      return res.status(200).send(response.buffer);
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] action='${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Unknown Error"
    });
  }
}