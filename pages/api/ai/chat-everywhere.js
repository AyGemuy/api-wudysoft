import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class EveryWhere {
  constructor() {
    this.cfg = {
      alias: {
        GPT_3_5: "gpt-3.5-turbo",
        GPT_3_5_AZ: "gpt-35-turbo",
        GPT_3_5_16K: "gpt-3.5-turbo-16k",
        GPT_4: "gpt-4-turbo",
        GPT_4_32K: "gpt-4-32k",
        GPT_4O: "gpt-4o",
        GPT_4O_MINI: "gpt-4o-mini",
        DEFAULT: "default",
        LANGCHAIN_CHAT: "langchain-chat",
        GPT4: "gpt-4",
        GPT4O: "gpt-4o",
        IMAGE_GEN: "image-gen",
        IMAGE_TO_PROMPT: "image-to-prompt",
        MQTT: "mqtt",
        AI_PAINTER: "ai-painter",
        GEMINI: "gemini"
      },
      items: {
        "gpt-3.5-turbo": {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5",
          maxLength: 12e3,
          tokenLimit: 4e3,
          completionTokenLimit: 2500,
          deploymentName: "gpt-35"
        },
        "gpt-35-turbo": {
          id: "gpt-35-turbo",
          name: "GPT-3.5",
          maxLength: 12e3,
          tokenLimit: 4e3,
          completionTokenLimit: 2500,
          deploymentName: "gpt-35"
        },
        "gpt-3.5-turbo-16k": {
          id: "gpt-3.5-turbo-16k",
          name: "GPT-3.5-16K",
          maxLength: 48e3,
          tokenLimit: 16e3,
          completionTokenLimit: 4e3,
          deploymentName: "gpt-35-16k"
        },
        "gpt-4-turbo": {
          id: "gpt-4-turbo",
          name: "GPT-4",
          maxLength: 24e3,
          tokenLimit: 7e3,
          completionTokenLimit: 2e3,
          deploymentName: "gpt-4"
        },
        "gpt-4-32k": {
          id: "gpt-4-32k",
          name: "GPT-4-32K",
          maxLength: 96e3,
          tokenLimit: 32e3,
          completionTokenLimit: 8e3,
          deploymentName: "gpt-4-32k"
        },
        "gpt-4o": {
          id: "gpt-4o",
          name: "GPT-4o",
          maxLength: 128e3,
          tokenLimit: 128e3,
          completionTokenLimit: 4096,
          deploymentName: "gpt-4o"
        },
        "gpt-4o-mini": {
          id: "gpt-4o-mini",
          name: "GPT-4o-mini",
          maxLength: 128e3,
          tokenLimit: 128e3,
          completionTokenLimit: 16384,
          deploymentName: "gpt-4o-mini"
        },
        default: {
          id: "default",
          name: "Default",
          isPlug: true
        },
        "langchain-chat": {
          id: "langchain-chat",
          name: "Enhance Mode",
          isPlug: true
        },
        "gpt-4": {
          id: "gpt-4",
          name: "GPT-4 Plugin",
          isPlug: true
        },
        "gpt-4o-plug": {
          id: "gpt-4o",
          name: "GPT-4O Plugin",
          isPlug: true
        },
        "image-gen": {
          id: "image-gen",
          name: "Image Generation",
          isPlug: true
        },
        "image-to-prompt": {
          id: "image-to-prompt",
          name: "Image to Prompt",
          isPlug: true
        },
        mqtt: {
          id: "mqtt",
          name: "MQTT",
          isPlug: true
        },
        "ai-painter": {
          id: "ai-painter",
          name: "AI Painter",
          isPlug: true
        },
        gemini: {
          id: "gemini",
          name: "Gemini",
          isPlug: true
        }
      }
    };
    this.api = axios.create({
      baseURL: "https://chateverywhere.app/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://chateverywhere.app",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://chateverywhere.app/id",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "output-language": "",
        "user-selected-plugin-id": "",
        ...SpoofHead()
      }
    });
  }
  _id() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return e.message;
    }
  }
  _dec(b64) {
    try {
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch {
      return {
        browserId: this._id(),
        sessionUuid: this._id(),
        sessionStartMs: Date.now(),
        gaClientId: Math.floor(Math.random() * 1e9).toString()
      };
    }
  }
  _enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
    } catch {
      return "";
    }
  }
  _hdr(state) {
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1e3);
    const phc = encodeURIComponent(JSON.stringify({
      distinct_id: state.browserId,
      $sesid: [nowMs, state.sessionUuid, state.sessionStartMs],
      $epp: true
    }));
    return {
      cookie: [`_ga=GA1.1.${state.gaClientId}.${nowSec}`, `_ga_ZYMW9SZKVK=GS2.1.s${nowSec}$o1$g0$t${nowSec}$j60$l0$h0`, `ph_phc_9n85Ky3ZOEwVZlg68f8bI3jnOJkaV8oVGGJcoKfXyn1_posthog=${phc}`].join("; "),
      "user-browser-id": state.browserId
    };
  }
  _pr() {
    const base = `You are an AI language model named Chat Everywhere, designed to answer user questions as accurately and helpfully as possible. Always be aware of the current date and time, and make sure to generate responses in the exact same language as the user's query. Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. Additionally, format all responses using Markdown syntax, regardless of the input format.If the input includes text such as [lang=xxx], the response should not include this text.If the input includes math related content, you should use LaTex syntax, and wrap them in $$ symbols. Make sure you also wrap the bracket inside if needed. e.g. $$(a^2 + b^2 = c^2)$$If you were asked to generate a diagram, you should generate a diagram using Mermaid syntax by following the instructions strictly below.
Refer to the instructions below to create diagrams using Mermaid syntax if needed.

---

# Basic Structure

- **Diagram Type**: Start with a keyword like \`graph\`, \`sequenceDiagram\`, etc.
  - Example: \`graph TD\`

- **Nodes**: Define nodes with unique identifiers and labels.
  - Example: \`A[Node A]\`

- **Links**: Connect nodes using arrows (\`-->\`) or lines (\`---\`).
  - Example: \`A --> B\`

- **Flow Direction**: Set the direction with \`TD\` (top-to-bottom) or \`LR\` (left-to-right).
  - Example: \`graph LR\`

- **Subgraphs**: Group nodes with subgraphs for clarity.
  - Example:
    \`\`\`
    subgraph "Title"
      A --> B
    end
    \`\`\`

- **Styling**: Customize appearance using CSS-like syntax.
  - Example: \`A[Node A] {stroke: #333; fill: #FFF}\`

- **Array of labels**: Make sure to use double quotes around array of labels.
  - Example: \`["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]\`

# Example Diagrams

- **Flowchart**:

graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Result 1]
  B -->|No| D[Result 2]
  text

- **Sequence Diagram**:

sequenceDiagram
  Alice->>Bob: Hello Bob, how are you?
  Bob-->>Alice: I am good, thanks!
  text

- **Mind Map**:

mindmap
  root (("mindmap title"))
    ("Origins")
      ("Long history")
      ("Popularisation")
        ("British popular psychology author Tony Buzan")
    ("Research")
      ("On effectiveness<br/>and features")
      ("On Automatic creation")
        ("Uses")
            ("Creative techniques")
            ("Strategic planning")
            ("Argument mapping")
    ("Tools")
      ("Pen and paper")
      ("Mermaid")

- **Quadrant Chart**:

quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]

- **Pie Chart**:

pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15

- **XY Chart**:

xychart-beta
    title "Sales Revenue"
    x-axis ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]

# Guidelines

- Wrap Mermaid code with triple backticks and \`mermaid\`.
- Ensure correct syntax to avoid errors.
- Once you have outputted the Mermaid code, user can click the codeblock's top right bubble button to see the diagram directly, or copy the Mermaid code.
- Make sure to use ("") around titles, labels, and other text. Such as ("title") or ("label").
`;
    return base + "The current date is " + new Date().toLocaleDateString("en-GB") + ".";
  }
  _get(name) {
    const targetId = this.cfg.alias[name] || name;
    const targetObj = this.cfg.items[targetId];
    if (targetObj) {
      return {
        type: targetObj.isPlug ? "plugin" : "model",
        data: targetObj
      };
    }
    return {
      type: "model",
      data: this.cfg.items["gpt-3.5-turbo"]
    };
  }
  async chat({
    state,
    model = "gpt-4o",
    prompt,
    system_prompt = this._pr(),
    messages = [],
    ...rest
  }) {
    const target = this._get(model);
    const finalModel = target.type === "model" ? target.data : this.cfg.items["gpt-3.5-turbo"];
    const finalPluginId = target.type === "plugin" ? target.data.id : null;
    const payloadMessages = messages.length ? messages.map(msg => ({
      pluginId: msg?.pluginId !== undefined ? msg.pluginId : finalPluginId,
      content: msg?.content || "",
      fileList: msg?.fileList || [],
      role: msg?.role || "user"
    })) : [{
      pluginId: finalPluginId,
      content: prompt,
      fileList: [],
      role: "user"
    }];
    const payload = {
      model: finalModel,
      messages: payloadMessages,
      prompt: system_prompt,
      temperature: .5,
      enableConversationPrompt: false,
      ...rest
    };
    const stateObj = this._dec(state || "");
    const hdc = this._hdr(stateObj);
    try {
      const response = await this.api.post("/chat", payload, {
        headers: hdc
      });
      return {
        status: true,
        result: response.data,
        state: this._enc(stateObj)
      };
    } catch (error) {
      return {
        status: false,
        result: error.response ? error.response.data : error.message,
        state: state || ""
      };
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
  const api = new EveryWhere();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}