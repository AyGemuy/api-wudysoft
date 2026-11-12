import Head from 'next/head';

const NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Glass Next';
const URL_ = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

export default function Seo({
  title = 'Glass Next — Glassmorphism Starter',
  description = 'Starter Next.js bergaya glassmorphism dengan login, OAuth, guest, playground, dan PWA.',
  path = '/',
  image = '/og.png',
  noindex = false,
}) {
  const full = title.includes(NAME) ? title : `${title} · ${NAME}`;
  const url = `${URL_}${path}`;
  const img = image.startsWith('http') ? image : `${URL_}${image}`;
  return (
    <Head>
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={NAME} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:image:secure_url" content={img} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={full} />
      <meta property="og:locale" content="id_ID" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      <meta name="twitter:image:alt" content={full} />
    </Head>
  );
}
