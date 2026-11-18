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
 *        breadcrumbs ([{name, path}]), jsonLd (objek schema.org tambahan).
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
      <title>{full}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <meta name="application-name" content={NAME} />
      <meta name="theme-color" content="#0078d4" />
      {keywords && <meta name="keywords" content={Array.isArray(keywords) ? keywords.join(', ') : keywords} />}
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={NAME} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:image:secure_url" content={img} />
      {imgType && <meta property="og:image:type" content={imgType} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={full} />
      <meta property="og:locale" content="id_ID" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      <meta name="twitter:image:alt" content={full} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
    </Head>
  );
}
