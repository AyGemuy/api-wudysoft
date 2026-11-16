import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stream log API realtime.
 *  1) Socket.IO (/api/live → /api/live-socket) bila server mendukung WebSocket
 *  2) Otomatis turun ke polling /api/stats/live (mis. di Netlify serverless)
 *
 * status: connecting | socket | poll | offline | unauthorized
 * skew  : selisih jam server − jam browser (ms). Pakai `Date.now() + skew` agar grafik/RPS akurat
 *         walau jam perangkat salah.
 */
export function useLive({ max = 400 } = {}) {
  const [status, setStatus] = useState('connecting');
  const [events, setEvents] = useState([]);
  const [counters, setCounters] = useState(null);
  const [sys, setSys] = useState(null);
  const [paused, setPaused] = useState(false);
  const [skew, setSkew] = useState(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const lastTs = useRef(0);
  const seenIds = useRef(new Set());

  const noteTs = (list) => {
    for (const e of list) if (e.ts > lastTs.current) lastTs.current = e.ts;
  };

  const push = useCallback(
    (list) => {
      if (!list?.length) return;
      noteTs(list);
      if (pausedRef.current) return;
      setEvents((prev) => {
        const seen = seenIds.current;
        const add = list.filter((e) => !seen.has(e.id));
        if (!add.length) return prev;
        add.forEach((e) => seen.add(e.id));
        const next = [...add, ...prev].sort((a, b) => b.ts - a.ts).slice(0, max);
        if (seen.size > max * 3) { seen.clear(); next.forEach((e) => seen.add(e.id)); }
        return next;
      });
    },
    [max]
  );

  const replace = useCallback((list) => {
    noteTs(list);
    seenIds.current = new Set(list.map((e) => e.id));
    setEvents(list.slice(0, max));
  }, [max]);

  useEffect(() => {
    let alive = true;
    let socket = null;
    let timer = null;
    const syncClock = (serverTime) => { if (serverTime) setSkew(serverTime - Date.now()); };

    const startPolling = () => {
      if (!alive) return;
      setStatus('poll');
      let first = true;
      const tick = async () => {
        if (!alive) return;
        try {
          // mundur 6 dtk: event dari instance lain bisa tersimpan sedikit terlambat; duplikat dibuang lewat id
          const after = first || !lastTs.current ? 0 : Math.max(0, lastTs.current - 6000);
          const r = await fetch(`/api/stats/live?after=${after}`, { cache: 'no-store' });
          if (r.status === 401) { setStatus('unauthorized'); return; }
          const d = await r.json();
          if (d.ok) {
            syncClock(d.serverTime);
            if (first) { replace(d.events || []); first = false; } else push(d.events || []);
            setCounters(d.counters);
            setSys(d.sys);
            setStatus('poll');
          }
        } catch {
          setStatus('offline');
        }
        if (alive) timer = setTimeout(tick, 2000);
      };
      tick();
    };

    (async () => {
      try {
        const r = await fetch('/api/live', { cache: 'no-store' });
        if (r.status === 401) { setStatus('unauthorized'); return; }
        const d = await r.json();
        if (!d.ok) return startPolling();
        const { io } = await import('socket.io-client');
        let connected = false;
        let sumMs = 0;
        socket = io({ path: d.path, transports: ['websocket', 'polling'], reconnectionAttempts: 3, timeout: 4000 });
        socket.on('connect', () => { connected = true; if (alive) setStatus('socket'); });
        socket.on('snapshot', (s) => {
          syncClock(s.serverTime);
          replace(s.events || []);
          setCounters(s.counters);
          sumMs = (s.counters?.avgMs || 0) * (s.counters?.total || 0);
          setSys(s.sys);
        });
        socket.on('log', (ev) => {
          push([ev]);
          // hitung counter langsung dari event (counter server di-reset saat restart, DB tidak)
          setCounters((c) => {
            if (!c || seenIds.current.has(`c:${ev.id}`)) return c;
            seenIds.current.add(`c:${ev.id}`);
            const k = `${Math.floor(ev.status / 100)}xx`;
            const by = { ...(c.byClass || {}) };
            if (by[k] !== undefined) by[k] += 1;
            const total = (c.total || 0) + 1;
            sumMs += ev.ms;
            return { ...c, total, errors: (c.errors || 0) + (ev.status >= 400 ? 1 : 0), byClass: by, avgMs: Math.round(sumMs / total) };
          });
        });
        socket.on('sys', (m) => { syncClock(m.serverTime); setSys(m); });
        socket.on('connect_error', () => {
          if (!connected && alive) { socket.close(); startPolling(); }
        });
        socket.on('disconnect', () => { if (alive && connected) setStatus('connecting'); });
      } catch {
        startPolling();
      }
    })();

    return () => {
      alive = false;
      socket?.close();
      clearTimeout(timer);
    };
  }, [push, replace]);

  const clear = useCallback(() => { seenIds.current = new Set(); setEvents([]); }, []);
  return { status, events, counters, sys, paused, setPaused, clear, skew };
}
