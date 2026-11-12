import axios from "axios";
import crypto from "crypto";
const KEY = "0x4AAAAAABL7dEKVA5-OlS1S";
const VOICE_LIST = {
  celebrity: [{
    id: "us-female-adele",
    name: "Adele",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-puff-daddy",
    name: "Puff Daddy",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-justin-bieber",
    name: "Justin Bieber",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-justin-bieber-young",
    name: "Justin Bieber (Young)",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-kesha",
    name: "Kesha",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-sabrina-carpenter",
    name: "Sabrina Carpenter",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-teddy-swims",
    name: "Teddy Swims",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-eminem",
    name: "Eminem",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-gavin-newsom",
    name: "Gavin Newsom",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-ice-spice",
    name: "Ice Spice",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-jake-paul",
    name: "Jake Paul",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-john-lennon",
    name: "John Lennon",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-michael-jackson",
    name: "Michael Jackson",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-megan-thee",
    name: "Megan Thee Stallion",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-playboi-carti",
    name: "Playboi Carti",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-selena-gomez",
    name: "Selena Gomez",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-morgan-freeman",
    name: "Morgan Freeman",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-ronaldo",
    name: "Cristiano Ronaldo",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-taylorswift",
    name: "Taylor Swift",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-ariana-grande",
    name: "Ariana Grande",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-drake",
    name: "Drake",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-emilia-clarke",
    name: "Emilia Clarke",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-emma-waston",
    name: "Emma Watson",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-james-earl-jones",
    name: "James Earl Jones",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-jennifer-aniston",
    name: "Jennifer Aniston",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-keanu-reeves",
    name: "Keanu Reeves",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-kendrick-lamar",
    name: "Kendrick Lamar",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-lebron-james",
    name: "LeBron James",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-chris-evans",
    name: "Chris Evans",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-david-attenborough",
    name: "David Attenborough",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-stephen-hawking",
    name: "Stephen Hawking",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-snoopdogg",
    name: "Snoop Dogg",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-rose-happy",
    name: "Rosé (BLACKPINK)",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-lebron-james",
    name: "LeBron James",
    lang: "english",
    gender: "male"
  }],
  animation: [{
    id: "us-female-elastigirl",
    name: "Elastigirl",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-cartman",
    name: "Eric Cartman",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-grinch",
    name: "The Grinch",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-hank-hill",
    name: "Hank Hill",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-hatsune-miku",
    name: "Hatsune Miku",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-husk",
    name: "Husk",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-kermit-frog",
    name: "Kermit the Frog",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-mabel-pines",
    name: "Mabel Pines",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-minion",
    name: "Minion",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-mufasa",
    name: "Mufasa",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-sulley",
    name: "Sulley",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-yzma",
    name: "Yzma",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-shrek",
    name: "Shrek",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-elmo",
    name: "Elmo",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-mufasa",
    name: "Mufasa",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-elsa-frozen",
    name: "Elsa (Frozen)",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-peppa-pig",
    name: "Peppa Pig",
    lang: "english",
    gender: "female"
  }, {
    id: "stitch-male",
    name: "Stitch",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-mario",
    name: "Mario",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-sonic-thehedgehog",
    name: "Sonic the Hedgehog",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-joy",
    name: "Joy (Inside Out)",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-anya-forger",
    name: "Anya Forger",
    lang: "english",
    gender: "female"
  }, {
    id: "blackmythwukong-male",
    name: "Wukong",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-carmen-winstead",
    name: "Carmen Winstead",
    lang: "english",
    gender: "female"
  }],
  spongebob: [{
    id: "us-male-spongebob-default",
    name: "SpongeBob",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-patrickstar-happy",
    name: "Patrick Star",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-mrkrab-shouting",
    name: "Mr. Krabs",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-plankton-shouting",
    name: "Plankton",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-sandy-cheeks",
    name: "Sandy Cheeks",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-squidward-shouting",
    name: "Squidward",
    lang: "english",
    gender: "male"
  }],
  starwars: [{
    id: "us-male-yoda",
    name: "Yoda",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-anakin-skywalker",
    name: "Anakin Skywalker",
    lang: "english",
    gender: "male"
  }, {
    id: "c3po-starwars-male",
    name: "C-3PO",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-darthvader",
    name: "Darth Vader",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-luke-skywalker",
    name: "Luke Skywalker",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-obiwan-kenobi",
    name: "Obi-Wan Kenobi",
    lang: "english",
    gender: "male"
  }, {
    id: "stormstrooper-male",
    name: "Stormtrooper",
    lang: "english",
    gender: "male"
  }],
  familyguy: [{
    id: "us-male-peter-griffin",
    name: "Peter Griffin",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-lois-griffin",
    name: "Lois Griffin",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-meg-griffin",
    name: "Meg Griffin",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-stewie-griffin",
    name: "Stewie Griffin",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-brian-griffin",
    name: "Brian Griffin",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-joe-swanson",
    name: "Joe Swanson",
    lang: "english",
    gender: "male"
  }],
  simpsons: [{
    id: "us-male-bart-simpson",
    name: "Bart Simpson",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-homer-simpson",
    name: "Homer Simpson",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-lisa-simpson",
    name: "Lisa Simpson",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-marge-simpson",
    name: "Marge Simpson",
    lang: "english",
    gender: "female"
  }],
  onepiece: [{
    id: "ja-male-luffy",
    name: "Monkey D. Luffy",
    lang: "japanese",
    gender: "male"
  }, {
    id: "us-female-nami",
    name: "Nami",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-zoro",
    name: "Roronoa Zoro",
    lang: "english",
    gender: "male"
  }],
  dragonball: [{
    id: "us-male-goku-angry",
    name: "Goku",
    lang: "english",
    gender: "male"
  }, {
    id: "ja-male-vegeta",
    name: "Vegeta",
    lang: "japanese",
    gender: "male"
  }, {
    id: "ja-male-frieza",
    name: "Frieza",
    lang: "japanese",
    gender: "male"
  }],
  filmcharacters: [{
    id: "us-male-jigsaw",
    name: "Jigsaw",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-grinch",
    name: "The Grinch",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-batman",
    name: "Batman",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-deadpool",
    name: "Deadpool",
    lang: "english",
    gender: "male"
  }, {
    id: "ghostface-male",
    name: "Ghostface",
    lang: "english",
    gender: "male"
  }, {
    id: "rocket-male",
    name: "Rocket Raccoon",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-venom",
    name: "Venom",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-arthur-morgan",
    name: "Arthur Morgan",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-daryl-dixon",
    name: "Daryl Dixon",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-sheldon-cooper",
    name: "Sheldon Cooper",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-walter-white",
    name: "Walter White",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-freddy-fazbear",
    name: "Freddy Fazbear",
    lang: "english",
    gender: "male"
  }],
  game: [{
    id: "us-male-mario",
    name: "Mario",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-sonic-thehedgehog",
    name: "Sonic the Hedgehog",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-franklin-clinton",
    name: "Franklin Clinton",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-michael-desanta",
    name: "Michael De Santa",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-announcer",
    name: "MK Announcer",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-c00lkidd",
    name: "C00lkidd",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-news-guy",
    name: "News Guy (Bloxburg)",
    lang: "english",
    gender: "male"
  }, {
    id: "blackmythwukong-male",
    name: "Wukong",
    lang: "english",
    gender: "male"
  }],
  tv: [{
    id: "us-male-sheldon-cooper",
    name: "Sheldon Cooper",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-walter-white",
    name: "Walter White",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-daryl-dixon",
    name: "Daryl Dixon",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-hank-hill",
    name: "Hank Hill",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-lois-griffin",
    name: "Lois Griffin",
    lang: "english",
    gender: "female"
  }, {
    id: "us-female-jennifer-aniston",
    name: "Rachel Green",
    lang: "english",
    gender: "female"
  }],
  aivoicelabhot: [{
    id: "us-male-spongebob-default",
    name: "SpongeBob",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-patrickstar-happy",
    name: "Patrick Star",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-eminem",
    name: "Eminem",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-taylorswift",
    name: "Taylor Swift",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-morgan-freeman",
    name: "Morgan Freeman",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-goku-angry",
    name: "Goku",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-darthvader",
    name: "Darth Vader",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-shrek",
    name: "Shrek",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-gojo",
    name: "Gojo Satoru",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-naruto-uzumaki",
    name: "Naruto",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-optimus-prime",
    name: "Optimus Prime",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-megatron",
    name: "Megatron",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-ryomen-sukuna",
    name: "Ryomen Sukuna",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-katsuki-bakugo",
    name: "Katsuki Bakugo",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-tanjiro-kamado",
    name: "Tanjiro Kamado",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-nezuko-kamado",
    name: "Nezuko Kamado",
    lang: "english",
    gender: "female"
  }, {
    id: "us-male-izuku-midoriya",
    name: "Izuku Midoriya",
    lang: "english",
    gender: "male"
  }, {
    id: "us-male-sasuke-uchiha",
    name: "Sasuke Uchiha",
    lang: "english",
    gender: "male"
  }, {
    id: "us-female-madoka-kaname",
    name: "Madoka Kaname",
    lang: "english",
    gender: "female"
  }, {
    id: "ja-female-teto",
    name: "Kasane Teto",
    lang: "japanese",
    gender: "female"
  }, {
    id: "us-male-pim",
    name: "Pim",
    lang: "english",
    gender: "male"
  }]
};
const ALL_VOICES = Object.entries(VOICE_LIST).reduce((acc, [cat, voices]) => {
  voices.forEach(v => {
    if (!acc.find(x => x.id === v.id)) {
      acc.push({
        ...v,
        cat: cat
      });
    }
  });
  return acc;
}, []);

function find_voice(query, opts = {}) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  let pool = ALL_VOICES;
  if (opts.gender) pool = pool.filter(v => v.gender === opts.gender);
  if (opts.cat) pool = pool.filter(v => v.cat === opts.cat);
  if (opts.lang) pool = pool.filter(v => v.lang === opts.lang);
  let found = pool.find(v => v.id === q);
  if (found) return found;
  found = pool.find(v => v.name.toLowerCase() === q);
  if (found) return found;
  found = pool.find(v => v.name.toLowerCase().includes(q));
  if (found) return found;
  found = pool.find(v => v.id.toLowerCase().includes(q));
  if (found) return found;
  return null;
}
class VoiceClient {
  constructor(cfg = {}) {
    this.uid = `av${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    this.dom = "aivoicelab.net";
    this.head = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: `https://${this.dom}`,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `https://${this.dom}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...cfg.headers || {}
    };
    this.api = axios.create({
      headers: this.head
    });
  }
  sg(txt, ts) {
    try {
      const hex = Buffer.from(txt, "utf8").toString("hex");
      const raw = `text=${hex}&timestamp=${ts}`;
      return crypto.createHmac("sha256", KEY).update(raw).digest("hex");
    } catch (e) {
      console.error("[sg] Err:", e?.message);
      return null;
    }
  }
  async generate({
    text,
    voice,
    voice_name,
    gender,
    cat,
    ...rest
  }) {
    let resolvedVoice = null;
    if (voice) {
      resolvedVoice = find_voice(voice) || {
        id: voice,
        cat: rest?.cat || "aivoicelabhot",
        lang: rest?.lang || "english"
      };
    } else if (voice_name) {
      resolvedVoice = find_voice(voice_name, {
        gender: gender,
        cat: cat
      });
      if (!resolvedVoice) {
        console.warn(`[gen] Voice not found for query: "${voice_name}", using default`);
      }
    }
    if (!resolvedVoice) {
      resolvedVoice = {
        id: "us-male-spongebob-default",
        cat: "aivoicelabhot",
        lang: "english"
      };
    }
    console.log(`-> [gen] Voice: ${resolvedVoice.name || resolvedVoice.id} (${resolvedVoice.cat})`);
    try {
      const ts = Math.floor(Date.now() / 1e3);
      const txt = text || "Hello World";
      const sign = this.sg(txt, ts);
      const pl = {
        modelcat: resolvedVoice.cat || rest?.cat || "aivoicelabhot",
        modelname: resolvedVoice.id,
        modellang: resolvedVoice.lang || rest?.lang || "english",
        text: txt,
        subscript: 0,
        email: "",
        userid: this.uid,
        t: 1,
        tstamp: ts,
        snature: sign,
        domain: this.dom,
        ...rest
      };
      const r = await this.api.post("https://api.aivoicelab.net/api/genaudio", pl);
      const d = r?.data;
      const ok = d?.ret === 0;
      const url = d?.uri ? d.uri.startsWith("http") ? d.uri : `https://${this.dom}${d.uri}` : null;
      console.log("<- [gen]", ok ? "Success" : `Fail: ${d?.msg}`);
      return {
        ok: ok,
        url: url,
        voice: resolvedVoice,
        ...d
      };
    } catch (e) {
      console.error("<- [gen] Err:", e?.message);
      return {
        ok: false,
        err: e?.message
      };
    }
  }
  voice_list({
    cat = null
  }) {
    if (cat) return VOICE_LIST[cat] || [];
    return VOICE_LIST;
  }
  find_voice(query, opts = {}) {
    return find_voice(query, opts);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' required",
      actions: ["generate", "voice_list"]
    });
  }
  const api = new VoiceClient();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' required for action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "voice_list":
        result = api.voice_list(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          valid_actions: ["generate", "voice_list"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Internal server error"
    });
  }
}