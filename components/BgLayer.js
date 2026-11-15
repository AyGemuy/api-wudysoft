import { useEffect, useState } from 'react';
import { readBackground } from '@/src/lib/bgUpload';

const VIDEO_RE = /\.(mp4|webm|ogv)(\?|#|$)/i;

/** Latar kustom: gradien, gambar/video dari tautan, atau gambar unggahan. */
export default function BgLayer({ config }) {
  const [upload, setUpload] = useState('');

  useEffect(() => {
    const read = () => setUpload(readBackground());
    read();
    window.addEventListener('nexus:bg-upload', read);
    return () => window.removeEventListener('nexus:bg-upload', read);
  }, []);

  const { bgType, bgUrl, bgFit, bgPos, bgBlur, bgDim } = config;
  if (bgType === 'none') return null;

  const src = bgType === 'upload' ? upload : bgType === 'link' ? bgUrl : '';
  const isVideo = bgType === 'link' && VIDEO_RE.test(src);
  const dim = bgType === 'gradient' ? 0 : bgDim;

  const mediaStyle = {
    filter: bgBlur ? `blur(${bgBlur}px)` : undefined,
    backgroundImage: !isVideo && src ? `url("${String(src).replace(/"/g, '%22')}")` : undefined,
    backgroundSize: bgFit === 'repeat' ? 'auto' : bgFit,
    backgroundRepeat: bgFit === 'repeat' ? 'repeat' : 'no-repeat',
    backgroundPosition: `center ${bgPos}`,
  };

  return (
    <div className="bg-custom" aria-hidden="true" style={{ '--bg-dim': dim }}>
      {bgType === 'gradient' && <div className="bg-media bg-grad" />}
      {bgType !== 'gradient' && !isVideo && src && <div className="bg-media" style={mediaStyle} />}
      {isVideo && <video className="bg-media bg-video" style={{ filter: mediaStyle.filter }} src={src} autoPlay muted loop playsInline />}
    </div>
  );
}
