class ProxyManager {
  constructor() {
    const proxies = [{
      name: "artemisandros",
      url: "https://cors.artemisandros.workers.dev/?"
    }, {
      name: "supershadowcube",
      url: "https://cloudflare-cors-anywhere.supershadowcube.workers.dev/?url="
    }, {
      name: "prox",
      url: "https://prox.26bruunjorl.workers.dev/"
    }, {
      name: "wave",
      url: "https://plain-wave-6f5f.apis1.workers.dev/"
    }, {
      name: "hill",
      url: "https://young-hill-815e.apis3.workers.dev/"
    }, {
      name: "icy",
      url: "https://icy-morning-72e2.apis2.workers.dev/"
    }, {
      name: "fazri",
      url: "https://cors.fazri.workers.dev/"
    }, {
      name: "spring",
      url: "https://spring-night-57a1.3540746063.workers.dev/"
    }, {
      name: "sizable",
      url: "https://cors.sizable.workers.dev/"
    }, {
      name: "jiashu",
      url: "https://jiashu.1win.eu.org/"
    }];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)].url;
    this.url = names => {
      const filtered = Array.isArray(names) ? proxies.filter(p => names.includes(p.name)) : [];
      return pick(filtered.length ? filtered : proxies);
    };
    this.url.toString = () => pick(proxies);
  }
}
const PROXY = new ProxyManager();
export default PROXY;