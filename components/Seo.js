import Head from 'next/head';
import { useRouter } from 'next/router';
import site from '@/configs/siteConfig';
import { routeMeta } from '@/src/lib/seoMap';

const NAME = site.APP_NAME;
const BASE = site.SITE_URL.replace(/\/$/, '');

const squash = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/**
 * Semua tag meta untuk satu halaman, dibuat otomatis dari isi konten.
 *  - title/description: dari props, kalau kosong dari peta rute (src/lib/seoMap.js)
 *  - og:image: dibuat otomatis lewat /api/og (judul + deskripsi + label), kecuali `image` diberikan
 *  - path: default = URL halaman saat ini
 *  - origin: isi dengan host request pada halaman SSR agar URL absolut selalu benar
 *  - type="article" + publishedTime/modifiedTime untuk konten buatan pengguna (paste, code)
 * Setiap tag memakai `key` sehingga <Seo /> milik halaman menimpa <Seo /> bawaan di _app.js.
 */
export default function Seo({
  title,
  description,
  path,
  image,
  noindex = false,
  type = 'website',
  tag,
  keywords,
  author,
  publishedTime,
  modifiedTime,
  origin,
  jsonLd,
}) {
  const router = useRouter();
  const meta = routeMeta(router?.pathname);
  const base = (origin || BASE).replace(/\/$/, '');

  const rawTitle = title || meta.title;
  const full = rawTitle.toLowerCase().includes(NAME.toLowerCase()) ? rawTitle : `${rawTitle} · ${NAME}`;
  const desc = squash(description || meta.description, 200);
  const cleanPath = (path ?? (router?.asPath || '/')).split('#')[0].split('?')[0] || '/';
  const url = `${base}${cleanPath === '/' ? '' : cleanPath}` || base;
  const label = tag || meta.tag;

  const generated = !image;
  const img = generated
    ? `${base}/api/og?${new URLSearchParams({ title: squash(rawTitle, 96), desc: squash(description || meta.description, 190), tag: label, path: cleanPath }).toString()}`
    : image.startsWith('http') ? image : `${base}${image.startsWith('/') ? '' : '/'}${image}`;
  const imgType = generated || /\.png(\?|$)/i.test(img) ? 'image/png' : /\.jpe?g(\?|$)/i.test(img) ? 'image/jpeg' : /\.webp(\?|$)/i.test(img) ? 'image/webp' : 'image/png';

  const ld = jsonLd ?? {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebPage',
    name: full,
    headline: squash(rawTitle, 110),
    description: desc,
    url,
    image: img,
    inLanguage: 'id',
    isPartOf: { '@type': 'WebSite', name: NAME, url: base },
    ...(publishedTime ? { datePublished: publishedTime } : {}),
    ...(modifiedTime ? { dateModified: modifiedTime } : {}),
    ...(author ? { author: { '@type': 'Person', name: author } } : {}),
  };

  return (
    <Head>
      <title key="title">{full}</title>
      <meta key="description" name="description" content={desc} />
      <meta key="robots" name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      {keywords ? <meta key="keywords" name="keywords" content={Array.isArray(keywords) ? keywords.join(', ') : keywords} /> : null}
      {author ? <meta key="author" name="author" content={author} /> : null}
      <meta key="application-name" name="application-name" content={NAME} />
      <meta key="apple-title" name="apple-mobile-web-app-title" content={NAME} />
      <link key="canonical" rel="canonical" href={url} />

      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:site_name" property="og:site_name" content={NAME} />
      <meta key="og:title" property="og:title" content={full} />
      <meta key="og:description" property="og:description" content={desc} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={img} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={img} />
      <meta key="og:image:type" property="og:image:type" content={imgType} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      <meta key="og:image:alt" property="og:image:alt" content={full} />
      <meta key="og:locale" property="og:locale" content="id_ID" />
      {type === 'article' && publishedTime ? <meta key="article:published_time" property="article:published_time" content={publishedTime} /> : null}
      {type === 'article' && modifiedTime ? <meta key="article:modified_time" property="article:modified_time" content={modifiedTime} /> : null}
      {type === 'article' && author ? <meta key="article:author" property="article:author" content={author} /> : null}
      {type === 'article' && label ? <meta key="article:section" property="article:section" content={label} /> : null}

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={full} />
      <meta key="twitter:description" name="twitter:description" content={desc} />
      <meta key="twitter:image" name="twitter:image" content={img} />
      <meta key="twitter:image:alt" name="twitter:image:alt" content={full} />
      <meta key="twitter:url" name="twitter:url" content={url} />

      <script key="ld-json" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </Head>
  );
}
