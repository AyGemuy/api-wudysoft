import axios from "axios";
class ThreadsParser {
  constructor() {
    this.cookies = {};
    this.client = null;
    this.onCookiesUpdated = null;
    this.rPost = "adp_BarcelonaPostPageDirectQueryRelayPreloader";
    this.rProf = "adp_BarcelonaProfilePageDirectQueryRelayPreloader";
  }
  async setup(config) {
    try {
      console.log("[Process] Setting up Threads client instance...");
      this.cookies = {};
      this.onCookiesUpdated = config?.onCookiesUpdated || null;
      this.client = axios.create({
        baseURL: "https://www.threads.com",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-prefers-color-scheme": "dark",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-full-version-list": '"Chromium";v="127.0.6533.144", "Not)A;Brand";v="99.0.0.0", "Microsoft Edge Simulate";v="127.0.6533.144", "Lemur";v="127.0.6533.144"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-model": '"RMX3890"',
          "sec-ch-ua-platform": '"Android"',
          "sec-ch-ua-platform-version": '"15.0.0"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "viewport-width": "980",
          dpr: "2.549999952316284"
        },
        timeout: 15e3
      });
      this.client.interceptors.request.use(req => {
        try {
          const cookieStr = this.encC(this.cookies);
          if (cookieStr) req.headers["Cookie"] = cookieStr;
          return req;
        } catch (e) {
          return req;
        }
      });
      this.client.interceptors.response.use(res => {
        try {
          const setCookies = res.headers["set-cookie"] || [];
          if (setCookies.length > 0) {
            setCookies.forEach(cookieStr => {
              const parts = cookieStr.split(";")[0].split("=");
              if (parts.length >= 2) this.cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
            });
            if (this.onCookiesUpdated) {
              try {
                this.onCookiesUpdated(this.cookies);
              } catch (err) {}
            }
          }
          return res;
        } catch (e) {
          return res;
        }
      });
      console.log("[Process] Threads client successfully set up.");
      return true;
    } catch (error) {
      console.log(`[Error] Client setup failed: ${error.message}`);
      throw error;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      let currentUrl = url,
        redirectsCount = 0;
      if (!this.client) await this.setup();
      while (redirectsCount < 10) {
        try {
          console.log(`[Process] Fetching: ${currentUrl}`);
          const response = await this.client.get(currentUrl, {
            ...rest,
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
          });
          if (response.status >= 300 && response.status < 400) {
            const redirectUrl = response.headers["location"];
            if (!redirectUrl) return {
              html: response?.data || "",
              finalUrl: currentUrl
            };
            rest.headers = {
              ...rest.headers,
              referer: currentUrl
            };
            currentUrl = new URL(redirectUrl, currentUrl).toString();
            redirectsCount++;
            continue;
          }
          return {
            html: response?.data || "",
            finalUrl: currentUrl
          };
        } catch (error) {
          console.log(`[Error] Hop download failed: ${error.message}`);
          throw error;
        }
      }
      throw new Error("Redirect limit reached");
    } catch (e) {
      throw e;
    }
  }
  async autoInitCsrf() {
    try {
      if (!this.cookies?.csrftoken) {
        console.log("[Process] Target csrftoken not found. Fetching initial handshake token...");
        await this.download({
          url: "https://www.threads.com/"
        });
        console.log("[Process] Handshake complete.");
      }
    } catch (error) {
      console.log(`[Warning] Auto CSRF failed: ${error.message}`);
    }
  }
  async parse(data) {
    try {
      const url = data?.url ? data.url : "";
      if (!url) throw new Error("URL parameter is undefined");
      if (!this.client) await this.setup();
      await this.autoInitCsrf();
      console.log(`[Process] Starting parsing sequence for: ${url}`);
      const {
        html,
        finalUrl
      } = await this.download({
        url: url
      });
      console.log("[Process] Extracting post components...");
      const media = await this.fMedia(html, finalUrl);
      const postId = media?.pk ? String(media.pk) : "";
      if (!postId) throw new Error("Post PK identifier missing");
      const content = media?.caption?.text ? media.caption.text : null;
      const username = media?.user?.username ? media.user.username : "";
      const userData = username ? await this.fUser(username) : {};
      const cleanedUrl = finalUrl ? finalUrl.split("?")[0] : url;
      const rawResult = {
        ...media,
        pid: postId,
        url: cleanedUrl,
        title: null,
        content: content,
        media: this.pMed(media),
        author: this.pAuth(media?.user || {}, userData),
        platform: {
          code: "threads",
          name: "Threads",
          url: "https://www.threads.com/",
          icon_url: "https://raw.githubusercontent.com/content-hive/assets/main/IconSet/Threads.png"
        },
        post_time: media?.taken_at ? media.taken_at : null,
        parser: "threads",
        state: "SUCCESS"
      };
      return this.cln(rawResult);
    } catch (error) {
      console.log(`[Error] Parse aborted: ${error.message}`);
      throw error;
    }
  }
  cln(o) {
    try {
      if (Array.isArray(o)) {
        return o.map(v => v && typeof v === "object" ? this.cln(v) : v).filter(v => v !== null && v !== undefined && v !== "");
      }
      if (o && typeof o === "object") {
        return Object.entries(o).reduce((acc, [k, v]) => {
          if (v !== null && v !== undefined && v !== "") {
            const nv = typeof v === "object" ? this.cln(v) : v;
            if (nv !== null && nv !== undefined && nv !== "" && (typeof nv !== "object" || Object.keys(nv).length > 0 || Array.isArray(nv))) {
              acc[k] = nv;
            }
          }
          return acc;
        }, {});
      }
      return o;
    } catch (e) {
      return o;
    }
  }
  encC(cookies) {
    try {
      return Object.entries(cookies || {}).map(([k, v]) => k && v ? `${k}=${v}` : "").filter(Boolean).join("; ");
    } catch (e) {
      return "";
    }
  }
  extJ(html) {
    try {
      const regex = /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g,
        matches = [];
      let match;
      while ((match = regex.exec(html || "")) !== null) matches.push(match[1]);
      return matches;
    } catch (e) {
      return [];
    }
  }
  fVal(obj, key, val) {
    try {
      if (!obj || typeof obj !== "object") return null;
      if (obj[key] === val) return obj;
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const res = this.fVal(obj[k], key, val);
          if (res) return res;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  fValScan(html, username) {
    try {
      for (const raw of this.extJ(html)) {
        try {
          if (raw.includes('"biography"') && raw.includes(username)) {
            const userObj = this.fVal(JSON.parse(raw), "username", username);
            if (userObj && (userObj.biography || userObj.full_name)) return userObj;
          }
        } catch (e) {}
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  fRelay(html, relayKey) {
    try {
      for (const raw of this.extJ(html)) {
        try {
          const data = JSON.parse(raw);
          const requires = data?.require || [];
          for (const topItem of requires) {
            if (Array.isArray(topItem) && topItem[0] === "ScheduledServerJS") {
              const bbox = topItem?.[3]?.[0]?.["__bbox"]?.require || [];
              for (const item of bbox) {
                if (Array.isArray(item) && String(item[0]).startsWith("RelayPrefetchedStreamCache")) {
                  if (typeof item?.[3]?.[0] === "string" && item[3][0].startsWith(relayKey)) {
                    return item[3][1]["__bbox"]["result"]["data"];
                  }
                }
              }
            }
          }
        } catch (err) {}
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async fMedia(html, url) {
    try {
      const edges = this.fRelay(html, this.rPost)?.data?.edges || [];
      for (const edge of edges) {
        const threadItems = edge?.node?.thread_items || [];
        for (const item of threadItems) {
          if (item?.post?.pk) return item.post;
        }
      }
      throw new Error(`Media payload not found for ${url}`);
    } catch (e) {
      throw e;
    }
  }
  async fUser(username) {
    try {
      const {
        html
      } = await this.download({
        url: `https://www.threads.com/@${username}`
      });
      let user = this.fRelay(html, this.rProf)?.user || {};
      if (!user.biography) {
        const fallback = this.fValScan(html, username);
        if (fallback) user = {
          ...user,
          ...fallback
        };
      }
      return user;
    } catch (error) {
      console.log(`[Warning] Profiles lookup skipped for @${username}: ${error.message}`);
      return {};
    }
  }
  imgUrl(imageVersions) {
    try {
      return imageVersions?.candidates?.[0]?.url ? imageVersions.candidates[0].url : null;
    } catch (e) {
      return null;
    }
  }
  pCar(item) {
    try {
      const vids = item?.video_versions || [];
      const mapped = vids.length > 0 ? {
        url: vids[0]?.url,
        type: "VIDEO",
        cover: this.imgUrl(item?.image_versions2),
        duration: item?.video_duration ? Number(item.video_duration) : null,
        width: item?.original_width || null,
        height: item?.original_height || null
      } : {
        url: this.imgUrl(item?.image_versions2),
        type: "IMAGE",
        width: item?.original_width || null,
        height: item?.original_height || null
      };
      return mapped.url ? {
        ...item,
        ...mapped
      } : null;
    } catch (e) {
      return null;
    }
  }
  pMed(media) {
    try {
      const mediaType = media?.media_type,
        list = [];
      if (mediaType === 8) {
        (media?.carousel_media || []).forEach(item => {
          const parsed = this.pCar(item);
          if (parsed) list.push(parsed);
        });
      } else {
        const vids = media?.video_versions || [];
        const mapped = vids.length > 0 ? {
          url: vids[0]?.url,
          type: "VIDEO",
          cover: this.imgUrl(media?.image_versions2),
          duration: media?.video_duration ? Number(media.video_duration) : null,
          width: media?.original_width || null,
          height: media?.original_height || null
        } : {
          url: this.imgUrl(media?.image_versions2),
          type: "IMAGE",
          width: media?.original_width || null,
          height: media?.original_height || null
        };
        if (mapped.url) list.push(mapped);
      }
      return list;
    } catch (e) {
      return [];
    }
  }
  pAuth(postUser, userData) {
    try {
      const uid = postUser?.pk ? String(postUser.pk) : String(postUser?.id || "");
      const username = postUser?.username ? postUser.username : "";
      const name = userData?.full_name ? userData.full_name : postUser?.full_name || username;
      const hdPics = userData?.hd_profile_pic_versions || [];
      let avatar = hdPics.length > 0 ? hdPics[hdPics.length - 1]?.url : null;
      avatar = avatar ? avatar : userData?.profile_pic_url || postUser?.profile_pic_url;
      const bio = userData?.biography ? userData.biography : "";
      const profileUrl = username ? `https://www.threads.com/@${username}` : null;
      return {
        ...postUser,
        ...userData,
        uid: uid,
        name: name,
        username: username,
        avatar: avatar ? avatar : null,
        url: profileUrl,
        description: bio ? bio : null
      };
    } catch (e) {
      return {
        ...postUser,
        ...userData
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new ThreadsParser();
  try {
    const data = await api.parse(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}