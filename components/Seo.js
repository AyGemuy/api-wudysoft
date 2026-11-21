import Head from 'next/head';
import site from '@/configs/siteConfig';

const NAME = site.APP_NAME;
const URL_ = site.SITE_URL.replace(/\/$/, '');
const DEFAULT_DESC = `${NAME}: platform API, tools developer, paste & code share, serta ruang obrolan realtime dalam satu dasbor.`;

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/**
 * Meta lengkap + preview link (Open Graph / Twitter) yang dibuat OTOMATIS dari isi halaman.
 * Bila `image` tidak diberikan, gambar preview 1200×630 digenerate oleh /api/og dari
 * title + description + label — jadi setiap halaman (dan konten dinamis seperti paste/kode)
 * punya preview unik saat tautannya dibagikan.
 *
 * Props: title, description, path, image (opsional, URL/path), label (badge di gambar),
 *        meta (baris kecil di gambar), noindex, type ('website' | 'article'), publishedTime, keywords,
 *        breadcrumbs ([{name, path}]), jsonLd (objek schema.org tambahan),
 *        theme (id preset tema untuk warna gambar preview; bawaan = tema default situs).
 */
export default function Seo({
  title = `${NAME} — API, Tools & Developer Platform`,
  description = DEFAULT_DESC,
  path = '/',
  image,
  label,
  meta,
  noindex = false,
  type = 'website',
  publishedTime,
  keywords,
  breadcrumbs,
  jsonLd,
  theme,
}) {
  const bare = title.replace(new RegExp(`\\s*[·—|-]\\s*${NAME}$`), '');
  const full = title.includes(NAME) ? title : `${title} · ${NAME}`;
  const desc = clip(description, 200) || DEFAULT_DESC;
  const url = `${URL_}${path}`;

  let img = image;
  if (!img) {
    const q = new URLSearchParams({ title: clip(bare, 90), desc: clip(desc, 180) });
    if (label) q.set('label', label);
    if (meta) q.set('meta', meta);
    if (theme) q.set('theme', theme);
    img = `/api/og?${q.toString()}`;
  }
  img = img.startsWith('http') ? img : `${URL_}${img}`;
  // Data terstruktur (schema.org) untuk rich result mesin pencari
  const graph = [];
  if (path === '/') {
    graph.push(
      { '@type': 'WebSite', '@id': `${URL_}/#website`, url: URL_, name: NAME, description: DEFAULT_DESC, inLanguage: 'id-ID' },
      { '@type': 'Organization', '@id': `${URL_}/#org`, name: NAME, url: URL_, logo: `${URL_}/icons/icon-512.png` }
    );
  } else {
    graph.push({ '@type': type === 'article' ? 'Article' : 'WebPage', '@id': `${url}#page`, url, name: full, headline: clip(bare, 110), description: desc, image: img, inLanguage: 'id-ID', isPartOf: { '@id': `${URL_}/#website` }, ...(publishedTime ? { datePublished: publishedTime, dateModified: publishedTime } : {}), publisher: { '@id': `${URL_}/#org` } });
  }
  const crumbs = breadcrumbs || (path === '/' ? null : [{ name: 'Beranda', path: '/' }, ...path.split('/').filter(Boolean).map((seg, i, a) => ({ name: i === a.length - 1 ? bare : seg.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), path: `/${a.slice(0, i + 1).join('/')}` }))]);
  if (crumbs) graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${URL_}${c.path}` })) });
  if (jsonLd) graph.push(jsonLd);
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

  const imgType = img.includes('/api/og') || img.endsWith('.png') ? 'image/png' : undefined;

  return (
    <Head>
      <title key="title">{full}</title>
      <meta key="description" name="description" content={desc} />
      <meta key="robots" name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <meta key="application-name" name="application-name" content={NAME} />
      {keywords && <meta key="keywords" name="keywords" content={Array.isArray(keywords) ? keywords.join(', ') : keywords} />}
      <meta key="author" name="author" content={NAME} />
      <meta key="googlebot" name="googlebot" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1'} />
      <link key="canonical" rel="canonical" href={url} />
      <link key="alt-id" rel="alternate" hrefLang="id" href={url} />
      <link key="alt-x" rel="alternate" hrefLang="x-default" href={url} />

      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:site_name" property="og:site_name" content={NAME} />
      <meta key="og:title" property="og:title" content={full} />
      <meta key="og:description" property="og:description" content={desc} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={img} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={img} />
      {imgType && <meta key="og:image:type" property="og:image:type" content={imgType} />}
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      <meta key="og:image:alt" property="og:image:alt" content={full} />
      <meta key="og:locale" property="og:locale" content="id_ID" />
      {publishedTime && <meta key="article:published_time" property="article:published_time" content={publishedTime} />}

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:url" name="twitter:url" content={url} />
      <meta key="twitter:title" name="twitter:title" content={full} />
      <meta key="twitter:description" name="twitter:description" content={desc} />
      <meta key="twitter:image" name="twitter:image" content={img} />
      <meta key="twitter:image:alt" name="twitter:image:alt" content={full} />
      <script key="ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <meta key="thumbnail" name="thumbnail" content={img} />
      <link key="image_src" rel="image_src" href={img} />
      <meta key="og:image:fallback" property="og:image" content={`${URL_}/og.jpg`} />
      <meta key="og:updated_time" property="og:updated_time" content={new Date().toISOString().slice(0, 10)} />
      <meta key="twitter:domain" name="twitter:domain" content={URL_.replace(/^https?:\/\//, '')} />
      <meta key="twitter:label1" name="twitter:label1" content="Platform" />
      <meta key="twitter:data1" name="twitter:data1" content={NAME} />
      <meta key="referrer" name="referrer" content="strict-origin-when-cross-origin" />
      <meta key="format-detection" name="format-detection" content="telephone=no" />
      <meta key="generator" name="generator" content={`${NAME} · Next.js`} />
      <meta key="category" name="category" content="technology" />
      <meta key="rating" name="rating" content="general" />
      <meta key="mobile-web-app-capable" name="mobile-web-app-capable" content="yes" />
      <link key="me" rel="me" href={`https://github.com/${site.GITHUB_USER}`} />
      <link key="sitemap" rel="sitemap" type="application/xml" href={`${URL_}/sitemap.xml`} />
    </Head>
  );
}
