import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Music, ListMusic, ChevronDown } from 'lucide-react';
import { bgm, fetchMusicMeta, parseYouTube, ytThumb } from '@/src/lib/audio';
import { sound } from '@/src/lib/interactiveEffects';

const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`; };

/**
 * Kartu "Sedang diputar": sampul, judul, artis, deskripsi, bilah progres, kontrol (sebelumnya / putar-jeda / berikutnya)
 * dan — bila tautan berupa playlist — daftar lagu yang bisa diklik. Metadata dari /api/music/meta.
 */
export default function MusicPlayer({ url, state, on }) {
  const parsed = useMemo(() => parseYouTube(url), [url]);
  const ids = state.ids || [];
  const isList = parsed?.type === 'playlist' || ids.length > 1;
  const vid = state.videoId || (parsed?.type === 'video' ? parsed.id : '');
  const playing = state.status === 'playing';
  const [meta, setMeta] = useState(null);
  const [plist, setPlist] = useState(null);
  const [more, setMore] = useState(false);
  const [showList, setShowList] = useState(true);
  const [pos, setPos] = useState({ t: 0, d: 0 });
  const [drag, setDrag] = useState(null);
  const activeRef = useRef(null);

  useEffect(() => {
    let live = true;
    setMeta(null); setMore(false);
    if (vid) fetchMusicMeta({ id: vid }).then((d) => live && setMeta(d));
    return () => { live = false; };
  }, [vid]);

  useEffect(() => {
    let live = true;
    setPlist(null);
    if (parsed?.type === 'playlist') fetchMusicMeta({ list: parsed.id }).then((d) => live && setPlist(d));
    return () => { live = false; };
  }, [parsed?.type, parsed?.id]);

  useEffect(() => {
    const tick = () => setPos(bgm.progress());
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, []);

  // daftar lagu: dari metadata playlist; bila gagal, pakai ID dari pemutar
  const items = useMemo(() => {
    if (!isList) return [];
    const n = Math.max(ids.length, plist?.items?.length || 0);
    return Array.from({ length: n }, (_, i) => {
      const id = ids[i] || plist?.items?.[i]?.id;
      const m = plist?.items?.find((x) => x.id === id) || plist?.items?.[i] || {};
      return { id, title: m.title || (id === vid && (meta?.title || state.title)) || `Lagu ${i + 1}`, author: m.author || '', duration: m.duration || '' };
    }).filter((x) => x.id);
  }, [isList, ids, plist, vid, meta, state.title]);

  useEffect(() => { activeRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [state.index]);

  if (!url || !parsed) return null;
  const title = meta?.title || state.title || (state.status === 'loading' ? 'Memuat…' : 'Siap diputar');
  const author = meta?.author || state.author || '';
  const desc = meta?.description || (isList ? plist?.description : '') || '';
  const cover = ytThumb(vid || ids[0] || plist?.items?.[0]?.id || (parsed.type === 'video' ? parsed.id : ''));
  const shown = drag ?? pos.t;
  const pct = pos.d ? Math.min(100, (shown / pos.d) * 100) : 0;
  const isPlay = on && state.status !== 'paused' && state.status !== 'idle' && state.status !== 'error';

  return (
    <div className="mp">
      <div className={`mp-cover ${playing ? 'live' : ''}`}>
        {cover ? <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="mp-ph"><Music size={34} /></span>}
        <span className="mp-shade" aria-hidden="true" />
        {isList && <span className="mp-count"><ListMusic size={12} /> {Math.min(items.length, 999) ? `${(state.index || 0) + 1}/${items.length}` : 'Playlist'}</span>}
        {playing && <span className="mp-eq" aria-hidden="true"><i /><i /><i /><i /></span>}
      </div>

      <div className="mp-info">
        <b className="mp-title" title={title}>{title}</b>
        <span className="mp-artist">{author || (isList ? plist?.title || 'Playlist' : 'YouTube')}</span>
      </div>

      {desc && (
        <div className="mp-desc">
          <p className={more ? 'open' : ''}>{desc}</p>
          {desc.length > 110 && <button type="button" className="mp-more" onClick={() => setMore((v) => !v)}>{more ? 'Ringkas' : 'Selengkapnya'}</button>}
        </div>
      )}

      <div className="mp-bar">
        <span>{fmt(shown)}</span>
        <input type="range" min="0" max={Math.max(1, Math.floor(pos.d))} step="1" value={Math.floor(shown)} style={{ '--p': `${pct}%` }} disabled={!pos.d}
          onChange={(e) => setDrag(+e.target.value)} onPointerUp={() => { if (drag != null) { bgm.seek(drag); setPos((p) => ({ ...p, t: drag })); setDrag(null); } }}
          onKeyUp={() => { if (drag != null) { bgm.seek(drag); setDrag(null); } }} aria-label="Posisi lagu" />
        <span>{fmt(pos.d)}</span>
      </div>

      <div className="mp-ctl">
        <button type="button" className="mp-b" onClick={() => { sound.playClick(); bgm.prev(); }} aria-label={isList ? 'Lagu sebelumnya' : 'Ulang dari awal'}><SkipBack size={18} /></button>
        <button type="button" className="mp-b main" onClick={() => { sound.playClick(); bgm.toggle(); }} aria-label={isPlay ? 'Jeda' : 'Putar'}>{isPlay ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}</button>
        <button type="button" className="mp-b" onClick={() => { sound.playClick(); bgm.next(); }} aria-label={isList ? 'Lagu berikutnya' : 'Ulang dari awal'} disabled={!isList}><SkipForward size={18} /></button>
      </div>

      {isList && items.length > 0 && (
        <div className="mp-list">
          <button type="button" className="mp-list-h" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
            <ListMusic size={14} /> <span>Daftar putar{plist?.title ? ` · ${plist.title}` : ''}</span> <em>{items.length}</em>
            <ChevronDown size={14} style={{ transform: showList ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showList && (
            <ol data-lenis-prevent>
              {items.map((it, i) => {
                const cur = i === (state.index || 0);
                return (
                  <li key={`${it.id}-${i}`}>
                    <button type="button" ref={cur ? activeRef : null} className={cur ? 'on' : ''} onClick={() => { sound.playClick(); bgm.playIndex(i); }} aria-current={cur ? 'true' : undefined}>
                      <span className="mp-n">{cur && playing ? <span className="mp-eq sm" aria-hidden="true"><i /><i /><i /></span> : i + 1}</span>
                      <img src={ytThumb(it.id)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      <span className="mp-t"><b>{it.title}</b>{it.author && <small>{it.author}</small>}</span>
                      {it.duration && <span className="mp-d">{it.duration}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <style jsx global>{`
        .mp { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 12px; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
        .mp-cover { position: relative; aspect-ratio: 16 / 9; border-radius: calc(var(--r-m) - 2px); overflow: hidden; background: linear-gradient(135deg, var(--a1), var(--a3)); display: grid; place-items: center; color: var(--on-accent, #fff); box-shadow: 0 14px 30px -16px rgba(0,0,0,.7); }
        .mp-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.01); transition: transform 6s ease; }
        .mp-cover.live img { transform: scale(1.08); }
        .mp-shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,.55)); }
        .mp-count { position: absolute; left: 8px; top: 8px; display: inline-flex; gap: 5px; align-items: center; padding: 3px 9px; border-radius: 999px; font-family: var(--font-mono); font-size: .64rem; background: rgba(0,0,0,.55); color: #fff; backdrop-filter: blur(6px); }
        .mp-eq { position: absolute; right: 10px; bottom: 10px; display: inline-flex; align-items: flex-end; gap: 3px; height: 16px; }
        .mp-eq i { width: 3px; height: 100%; background: #fff; border-radius: 2px; transform-origin: bottom; animation: au-bar .9s ease-in-out infinite; }
        .mp-eq i:nth-child(2) { animation-delay: -.25s; } .mp-eq i:nth-child(3) { animation-delay: -.5s; } .mp-eq i:nth-child(4) { animation-delay: -.7s; }
        .mp-eq.sm { position: static; height: 12px; gap: 2px; } .mp-eq.sm i { width: 2px; background: var(--a2); }
        .mp-info { display: grid; gap: 2px; min-width: 0; }
        .mp-title { font-size: 1rem; line-height: 1.25; letter-spacing: -.01em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
        .mp-artist { font-size: .78rem; color: var(--a2); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-desc p { margin: 0; font-size: .76rem; line-height: 1.5; color: var(--muted); white-space: pre-line; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-height: none; }
        .mp-desc p.open { display: block; max-height: 220px; overflow-y: auto; -webkit-line-clamp: unset; }
        .mp-more { margin-top: 4px; padding: 0; border: 0; background: none; color: var(--a2); font-size: .72rem; font-weight: 700; cursor: pointer; }
        .mp-bar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: .66rem; color: var(--muted); }
        .mp-bar input { -webkit-appearance: none; appearance: none; height: 5px; border-radius: 99px; margin: 0; cursor: pointer; background: linear-gradient(90deg, var(--a2) var(--p, 0%), var(--surface-3) var(--p, 0%)); }
        .mp-bar input:disabled { cursor: default; opacity: .6; }
        .mp-bar input::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid var(--a2); }
        .mp-bar input::-moz-range-thumb { width: 8px; height: 8px; border-radius: 50%; background: #fff; border: 2px solid var(--a2); }
        .mp-ctl { display: flex; align-items: center; justify-content: center; gap: 14px; }
        .mp-b { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); cursor: pointer; transition: transform .15s, border-color .2s, color .2s; }
        .mp-b:hover:not(:disabled) { border-color: var(--a2); color: var(--a2); } .mp-b:active:not(:disabled) { transform: scale(.92); } .mp-b:disabled { opacity: .35; cursor: not-allowed; }
        .mp-b.main { width: 54px; height: 54px; border: 0; color: var(--on-accent, #fff); background: linear-gradient(135deg, var(--a1), var(--a3)); box-shadow: 0 12px 24px -12px var(--a2); }
        .mp-b.main:hover:not(:disabled) { color: var(--on-accent, #fff); filter: brightness(1.1); }
        .mp-list { display: grid; gap: 6px; border-top: 1px solid var(--border); padding-top: 10px; }
        .mp-list-h { display: flex; align-items: center; gap: 7px; width: 100%; padding: 2px 0; border: 0; background: none; color: var(--text); font: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; }
        .mp-list-h span { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-list-h em { font-style: normal; font-family: var(--font-mono); font-size: .66rem; color: var(--muted); }
        .mp-list ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 280px; overflow-y: auto; overscroll-behavior: contain; }
        .mp-list li button { display: grid; grid-template-columns: 22px 44px minmax(0, 1fr) auto; align-items: center; gap: 9px; width: 100%; padding: 6px; border: 1px solid transparent; border-radius: var(--r-s); background: none; color: var(--text); text-align: left; font: inherit; cursor: pointer; transition: background .2s, border-color .2s; }
        .mp-list li button:hover { background: color-mix(in srgb, var(--text) 6%, transparent); }
        .mp-list li button.on { background: color-mix(in srgb, var(--a2) 14%, transparent); border-color: color-mix(in srgb, var(--a2) 40%, transparent); }
        .mp-n { text-align: center; font-family: var(--font-mono); font-size: .66rem; color: var(--muted); display: grid; place-items: center; }
        .mp-list img { width: 44px; height: 30px; border-radius: 6px; object-fit: cover; background: var(--surface-3); }
        .mp-t { min-width: 0; display: grid; } .mp-t b { font-size: .76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .mp-t small { font-size: .66rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-d { font-family: var(--font-mono); font-size: .64rem; color: var(--muted); }
        html[data-anim='off'] .mp-eq i { animation: none; } html[data-anim='off'] .mp-cover img { transition: none; transform: none; }
      `}</style>
    </div>
  );
}
