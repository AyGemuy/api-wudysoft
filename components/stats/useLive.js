import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stream log API realtime.
 *  1) Socket.IO (/api/live → /api/live-socket) bila server mendukung WebSocket
 *  2) Otomatis turun ke polling /api/stats/live (mis. di Netlify serverless)
 * status: connecting | socket | poll | offline | unauthorized
 */
export function useLive({ max = 400 } = {}) {
  const [status, setStatus] = useState('connecting');
  const [events, setEvents] = useState([]);
  const [counters, setCounters] = useState(null);
  const [sys, setSys] = useState(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const lastSeq = useRef(0);

  const push = useCallback(
    (list) => {
      if (!list?.length || pausedRef.current) return;
      setEvents((prev) => {
        const seen = new Set(prev.slice(0, 80).map((e) => e.id));
        const add = list.filter((e) => !seen.has(e.id));
        return add.length ? [...add, ...prev].slice(0, max) : prev;
      });
    },
    [max]
  );

  useEffect(() => {
    let alive = true;
    let socket = null;
    let timer = null;

    const startPolling = () => {
      if (!alive) return;
      setStatus('poll');
      const tick = async () => {
        if (!alive) return;
        try {
          const r = await fetch(`/api/stats/live?since=${lastSeq.current}`, { cache: 'no-store' });
          if (r.status === 401) { setStatus('unauthorized'); return; }
          const d = await r.json();
          if (d.ok) {
            if (d.lastSeq) lastSeq.current = Math.max(lastSeq.current, d.lastSeq);
            push(d.events || []);
            setCounters(d.counters);
            setSys(d.sys);
            setStatus('poll');
          }
        } catch {
          setStatus('offline');
        }
        timer = setTimeout(tick, 2000);
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
        socket = io({ path: d.path, transports: ['websocket', 'polling'], reconnectionAttempts: 3, timeout: 4000 });
        socket.on('connect', () => { connected = true; if (alive) setStatus('socket'); });
        socket.on('snapshot', (s) => {
          setEvents(s.events || []);
          setCounters(s.counters);
          setSys(s.sys);
          lastSeq.current = s.counters?.lastSeq || 0;
        });
        socket.on('log', (ev) => { lastSeq.current = Math.max(lastSeq.current, ev.seq || 0); push([ev]); });
        socket.on('sys', (m) => { setSys(m); if (m.counters) setCounters(m.counters); });
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
  }, [push]);

  const clear = useCallback(() => setEvents([]), []);
  return { status, events, counters, sys, paused, setPaused, clear };
}
