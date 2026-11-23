import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import RoomPicker, { GroupAvatar } from '@/components/rooms/RoomPicker';
import { UserAvatar, MediaView, ReplyQuote, Lightbox, Linkified, ChatStyles } from '@/components/rooms/ChatBits';
import { handleOf, colorOf } from '@/src/lib/chatUser';
import { uploadMedia, MAX_UPLOAD_MB } from '@/src/lib/uploadMedia';
import { toast, confirmToast } from '@/src/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import {
  MessageSquare,
  Users,
  Send,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Hash,
  Sparkles,
  User,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  Reply,
  X,
  Loader2,
  FileText,
  Film,
  Music2,
  ImagePlus
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function RoomsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const router = useRouter();
  const [activeMeta, setActiveMeta] = useState(null);
  // sumber kebenaran = URL (?room=): null = pilih grup dari daftar dulu
  const activeRoom = router.isReady && typeof router.query.room === 'string' && router.query.room ? router.query.room : null;
  const [listKey, setListKey] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [replyTo, setReplyTo] = useState(null); // pesan yang sedang dibalas
  const [pending, setPending] = useState([]); // lampiran: { id, name, type, preview, progress, status, media }
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [coarse, setCoarse] = useState(false); // geser-untuk-membalas hanya di layar sentuh
  useEffect(() => { try { setCoarse(window.matchMedia('(pointer: coarse)').matches); } catch {} }, []);

  const prevCount = useRef(null);
  const sig = useRef('');
  const stick = useRef(true); // true bila pengguna sedang di dasar percakapan
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const aborts = useRef(new Map());

  const myId = user?.id ? String(user.id) : '';
  const isMine = (m) => !!user && ((m.userId && String(m.userId) === myId) || (!m.userId && m.name === user.name));

  // Gulir hanya area pesan (scrollIntoView menggulir seluruh halaman → di HP loncat ke footer)
  const streamRef = useRef(null);
  const scrollToBottom = (smooth = true) => {
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };
  const onScrollStream = () => {
    const el = streamRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  // Buka / tutup grup; ?room= menjaga pilihan saat refresh & bisa dibagikan
  const openRoom = (r) => {
    setMessages([]);
    sig.current = '';
    prevCount.current = null;
    stick.current = true;
    setReplyTo(null);
    clearPending();
    setActiveMeta(r || null);
    router.push({ pathname: '/rooms', query: r ? { room: r.roomName } : {} }, undefined, { shallow: true, scroll: false });
  };

  // 2. Fetch Messages from Active Room
  const fetchMessages = useCallback(async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/rooms?roomName=${encodeURIComponent(activeRoom)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // render ulang hanya bila ada perubahan (hindari lompatan gulir tiap polling)
        const next = json.data.map((m) => `${m._id}:${m.likes?.length || 0}:${m.edited || ''}`).join('|');
        const prev = prevCount.current;
        const last = json.data[json.data.length - 1];
        const mine = last && user && ((last.userId && String(last.userId) === String(user.id)) || (!last.userId && user.name === last.name));
        if (prev !== null && json.data.length > prev && last && !mine) sound.fx('receive');
        prevCount.current = json.data.length;
        if (next !== sig.current) { sig.current = next; setMessages(json.data); }
      }
    } catch {}
  }, [activeRoom, user?.id, user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeRoom) return undefined;
    fetchMessages();
    const timer = setInterval(fetchMessages, 3500); // Polling realtime
    return () => clearInterval(timer);
  }, [activeRoom, fetchMessages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (stick.current || (last && isMine(last))) scrollToBottom(prevCount.current !== null && messages.length > 1);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Lampiran: pilih / tempel / seret → langsung diunggah ke URL ----------
  const clearPending = () => {
    aborts.current.forEach((c) => c.abort());
    aborts.current.clear();
    setPending((p) => { p.forEach((x) => x.preview && URL.revokeObjectURL(x.preview)); return []; });
  };

  const startUpload = async (item, file) => {
    const ctl = new AbortController();
    aborts.current.set(item.id, ctl);
    try {
      const media = await uploadMedia(file, {
        room: activeRoom || '',
        signal: ctl.signal,
        onProgress: (v) => setPending((l) => l.map((x) => (x.id === item.id ? { ...x, progress: v } : x))),
      });
      setPending((l) => l.map((x) => (x.id === item.id ? { ...x, status: 'done', progress: 1, media } : x)));
    } catch (e) {
      if (e.message !== 'Dibatalkan') {
        setPending((l) => l.map((x) => (x.id === item.id ? { ...x, status: 'error' } : x)));
        toast.err(`${file.name}: ${e.message}`);
      }
    } finally {
      aborts.current.delete(item.id);
    }
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = 6 - pending.length;
    if (room <= 0) return toast.warn('Maksimal 6 lampiran per pesan.');
    if (files.length > room) toast.warn(`Hanya ${room} lampiran lagi yang bisa ditambahkan.`);
    files.slice(0, room).forEach((file) => {
      if (file.size > 25 * 1024 * 1024 || (!file.type.startsWith('image/') && file.size > MAX_UPLOAD_MB * 1024 * 1024)) {
        return toast.err(`${file.name}: ukuran maksimal ${MAX_UPLOAD_MB} MB (gambar otomatis diperkecil).`);
      }
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
      const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, type, preview: type === 'image' || type === 'video' ? URL.createObjectURL(file) : '', progress: 0, status: 'uploading', media: null };
      setPending((l) => [...l, item]);
      startUpload(item, file);
    });
    sound.playClick();
  };

  const removePending = (id) => {
    aborts.current.get(id)?.abort();
    setPending((l) => { const x = l.find((i) => i.id === id); if (x?.preview) URL.revokeObjectURL(x.preview); return l.filter((i) => i.id !== id); });
  };

  const onPaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) { e.preventDefault(); addFiles(files); }
  };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer?.files); };

  useEffect(() => () => { aborts.current.forEach((c) => c.abort()); }, []);

  // ---------- Balas ----------
  const startReply = (m) => {
    sound.playClick();
    setReplyTo(m);
    taRef.current?.focus();
  };
  const jumpTo = (id) => {
    const el = streamRef.current?.querySelector(`[data-mid="${id}"]`);
    if (!el) return toast.info('Pesan asli sudah tidak ada.');
    stick.current = false;
    streamRef.current.scrollTo({ top: Math.max(0, el.offsetTop - 70), behavior: 'smooth' });
    el.classList.remove('cr-hl'); void el.offsetWidth; el.classList.add('cr-hl');
    setTimeout(() => el.classList.remove('cr-hl'), 1500);
  };

  // 3. Send Message
  const uploading = pending.some((p) => p.status === 'uploading');
  const readyMedia = pending.filter((p) => p.status === 'done').map((p) => p.media);
  const canSend = !sending && !uploading && (inputMsg.trim() || readyMedia.length > 0);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!canSend) return;

    if (!user) {
      sound.playClick();
      toast.info('Masuk dulu sebagai tamu untuk mengirim pesan.');
      signIn('guest');
      return;
    }

    sound.playClick();
    setSending(true);
    const textToSend = inputMsg;
    const mediaToSend = readyMedia;
    const replying = replyTo;
    stick.current = true;
    setInputMsg('');
    setReplyTo(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: replying ? 'replyMessage' : 'sendMessage',
          roomName: activeRoom,
          name: user.name || 'Operative',
          userId: user.id || 'guest_user',
          avatar: user.image || '',
          message: textToSend,
          media: mediaToSend,
          replyToMessageId: replying?._id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        sound.fx('send');
        setPending((l) => { l.forEach((x) => x.preview && URL.revokeObjectURL(x.preview)); return []; });
        fetchMessages();
      } else {
        throw new Error(json.message || 'Pesan gagal dikirim');
      }
    } catch (err) {
      setInputMsg(textToSend);
      setReplyTo(replying);
      toast.err(err.message || 'Pesan gagal dikirim');
    } finally {
      setSending(false);
    }
  };

  // 4. Create Group Room
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    sound.playClick();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGroup',
          roomName: newRoomName.trim(),
          createdBy: user?.name || '',
          avatar: user?.image || '',
        }),
      });

      const json = await res.json();
      if (json.success) {
        sound.playBeep();
        toast.ok(`Channel #${newRoomName.trim()} dibuat.`);
        setNewRoomName('');
        setCreateModal(false);
        setListKey((k) => k + 1);
        openRoom(json.data);
      } else {
        toast.err(json.message || 'Gagal membuat channel');
      }
    } catch (err) {
      toast.err(err.message);
    }
  };

  // 5. Toggle Like
  const handleToggleLike = async (messageId) => {
    if (!user) { toast.info('Masuk dulu untuk memberi suka.'); return signIn('guest'); }
    sound.playClick();
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleLike',
          roomName: activeRoom,
          messageId,
          userId: user.id || 'guest_user',
        }),
      });
      fetchMessages();
    } catch {}
  };

  // 6. Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!(await confirmToast('Hapus pesan ini untuk semua orang?', { danger: true, okLabel: 'Hapus' }))) return;
    sound.playClick();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteMessage',
          roomName: activeRoom,
          messageId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Gagal menghapus pesan');
      if (replyTo?._id === messageId) setReplyTo(null);
      toast.ok('Pesan dihapus.');
      fetchMessages();
    } catch (err) {
      toast.err(err.message);
    }
  };

  // ---------- Pengelompokan pesan (pemisah tanggal, pesan beruntun satu pengirim) ----------
  const dayLabel = (t) => {
    const d = new Date(t); const now = new Date();
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, now)) return 'Hari ini';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    return same(d, y) ? 'Kemarin' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <>
      <Seo title="Chat Rooms" description="Ruang obrolan realtime multi-channel: buat channel, kirim pesan, dan beri reaksi." path="/rooms" label="CHAT" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="badge ok" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--a2)" />
              <span>REALTIME CHAT</span>
            </div>
            <h1>Chat Rooms</h1>
            <p>{activeRoom ? `Channel #${activeRoom}` : 'Pilih grup dari daftar untuk mulai ngobrol.'}</p>
          </div>

          <motion.button
            className="btn primary"
            onClick={() => {
              sound.playClick();
              setCreateModal(true);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '10px 18px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Buat Channel Baru
          </motion.button>
        </header>

        {/* Modal Buat Room */}
        <AnimatePresence>
          {createModal && (
            <motion.div
              className="search-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModal(false)}
            >
              <motion.div
                className="search-modal glass"
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="var(--a2)" /> Buat Group Channel
                  </h3>
                  <button onClick={() => setCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="field">
                    <label>Nama Channel (Tanpa Spasi)</label>
                    <input
                      required
                      className="input"
                      placeholder="contoh: developer-zone"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      autoFocus
                    />
                  </div>
                  <motion.button type="submit" className="btn primary full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    Inisialisasi Channel ⚡
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* tanpa AnimatePresence mode="wait": exit yang tidak selesai membuat daftar kosong sampai refresh */}
        <>
        {!activeRoom ? (
          <motion.div key="picker" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <RoomPicker onPick={openRoom} refreshKey={listKey} />
          </motion.div>
        ) : (
        <motion.div key="chat" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <div className="rooms-container glass">
          {/* Main Chat Stream */}
          <section className="chat-viewport" onDragOver={(e) => { if (e.dataTransfer?.types?.includes?.('Files')) { e.preventDefault(); setDragOver(true); } }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }} onDrop={onDrop}>
            {/* Active Header */}
            <div className="chat-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <button onClick={() => { sound.playClick(); openRoom(null); }} className="btn back-btn" aria-label="Kembali ke daftar grup"><ArrowLeft size={15} /><span>Daftar</span></button>
                <GroupAvatar room={activeMeta || { roomName: activeRoom }} size={34} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '0.98rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{activeRoom}</strong>
                  {activeMeta?.createdBy && <small style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>oleh {activeMeta.createdBy}</small>}
                </div>
              </div>
              <button onClick={fetchMessages} className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Message History */}
            <div className="messages-stream" ref={streamRef} onScroll={onScrollStream}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Belum ada transmisi pesan di channel #{activeRoom}. Mulai percakapan pertama!
                </div>
              ) : (
                messages.map((msg, i) => {
                  const mine = isMine(msg);
                  const prev = messages[i - 1];
                  const newDay = !prev || new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                  const sameSender = prev && !newDay && ((prev.userId && prev.userId === msg.userId) || (!prev.userId && prev.name === msg.name)) && msg.timestamp - prev.timestamp < 5 * 60 * 1000;
                  const uname = msg.username || handleOf(msg.name, msg.userId);
                  const liked = !!myId && msg.likes?.includes(myId);
                  const rp = msg.replyPreview || null;
                  return (
                    <div key={msg._id} style={{ display: 'contents' }}>
                      {newDay && <div className="cr-date">{dayLabel(msg.timestamp)}</div>}
                      <motion.div
                        data-mid={msg._id}
                        className={`cr-row ${mine ? 'mine' : ''} ${sameSender ? 'cont' : ''}`}
                        layout="position"
                        initial={{ opacity: 0, x: mine ? 28 : -28, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        style={{ transformOrigin: mine ? 'right bottom' : 'left bottom' }}
                        drag={coarse ? 'x' : false}
                        dragDirectionLock
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0, right: 0.35 }}
                        dragSnapToOrigin
                        onDragEnd={(_, info) => { if (info.offset.x > 64) startReply(msg); }}
                      >
                        {!mine && (sameSender ? <span className="cr-spacer" /> : <UserAvatar name={msg.name} userId={msg.userId} src={msg.avatar} size={34} />)}
                        <div className="cr-bub">
                          {!mine && !sameSender && (
                            <div className="cr-who">
                              <b style={{ color: colorOf(msg.userId || msg.name) }}>{msg.name}</b>
                              <small>@{uname}</small>
                            </div>
                          )}
                          {rp && <ReplyQuote r={rp} mine={mine} onJump={() => jumpTo(msg.replyTo)} />}
                          {msg.media?.length > 0 && <MediaView media={msg.media} onOpen={setLightbox} />}
                          {msg.message ? <p className="cr-txt"><Linkified text={msg.message} /></p> : null}
                          <div className="cr-foot">
                            <span className="cr-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {msg.edited ? ' · diedit' : ''}
                            </span>
                            <button type="button" className="cr-btn" onClick={() => startReply(msg)} aria-label="Balas pesan" title="Balas">
                              <Reply size={12} />
                            </button>
                            <button type="button" className={`cr-btn ${liked ? 'liked' : ''}`} onClick={() => handleToggleLike(msg._id)} aria-label="Suka" aria-pressed={liked}>
                              <ThumbsUp size={12} /> {msg.likes?.length || 0}
                            </button>
                            {mine && (
                              <button type="button" className="cr-btn del" onClick={() => handleDeleteMessage(msg._id)} aria-label="Hapus pesan" title="Hapus">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Komposer: balasan, lampiran, input */}
            <form onSubmit={handleSendMessage} className="cr-comp">
              <AnimatePresence initial={false}>
                {replyTo && (
                  <motion.div key="rb" className="cr-replybar" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Reply size={15} color="var(--a2)" />
                    <ReplyQuote
                      r={{ name: replyTo.name, userId: replyTo.userId, text: replyTo.message, mediaType: replyTo.media?.[0]?.type, mediaUrl: replyTo.media?.[0]?.type === 'image' ? replyTo.media[0].url : '' }}
                    />
                    <button type="button" className="cr-icon-btn" style={{ width: 32, height: 32, borderRadius: 10 }} onClick={() => setReplyTo(null)} aria-label="Batalkan balasan"><X size={15} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {pending.length > 0 && (
                <div className="cr-tray" aria-label="Lampiran">
                  {pending.map((p) => (
                    <div key={p.id} className={`cr-chip ${p.status === 'error' ? 'err' : ''}`} title={p.name}>
                      {p.type === 'image' && <img src={p.preview} alt="" />}
                      {p.type === 'video' && <video src={p.preview} muted />}
                      {p.type === 'audio' && <Music2 size={22} />}
                      {p.type === 'file' && <FileText size={22} />}
                      <span className="cr-name">{p.name}</span>
                      {p.status === 'uploading' && <span className="cr-prog"><Loader2 size={16} className="spin" /> <i style={{ width: `${Math.round(p.progress * 100)}%` }} /></span>}
                      <button type="button" className="cr-chip-x" onClick={() => removePending(p.id)} aria-label={`Hapus ${p.name}`}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="cr-inrow">
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <button type="button" className="cr-icon-btn" onClick={() => fileRef.current?.click()} aria-label="Lampirkan foto, video, atau berkas" title="Lampirkan media">
                  <Paperclip size={18} />
                </button>
                <textarea
                  ref={taRef}
                  className="input cr-ta"
                  rows={1}
                  placeholder={user ? `Pesan ke #${activeRoom}…` : 'Masuk terlebih dahulu untuk mengirim pesan…'}
                  value={inputMsg}
                  onChange={(e) => { setInputMsg(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(130, e.target.scrollHeight)}px`; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMessage(); } }}
                  onPaste={onPaste}
                  disabled={sending}
                  maxLength={4000}
                />
                <motion.button
                  type="submit"
                  className="btn primary"
                  disabled={!canSend}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ width: 46, height: 42, padding: 0, borderRadius: '14px', display: 'grid', placeItems: 'center' }}
                  aria-label="Kirim"
                >
                  {sending || uploading ? <Loader2 size={17} className="spin" /> : <Send size={16} />}
                </motion.button>
              </div>
            </form>
            <AnimatePresence>
              {dragOver && <motion.div className="cr-drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span><ImagePlus size={30} /><br />Lepaskan untuk mengunggah</span></motion.div>}
            </AnimatePresence>
          </section>
        </div>
        </motion.div>
        )}
        </>
      </div>

      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
      <ChatStyles />

      <style jsx>{`
        .rooms-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          height: min(620px, calc(100dvh - 220px));
          min-height: 440px;
          border-radius: var(--radius);
          overflow: hidden;
        }
        .rooms-sidebar {
          background: color-mix(in srgb, var(--bg1) 35%, transparent);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }
        .sidebar-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border-bottom: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--muted);
          letter-spacing: 0.05em;
        }
        .channels-list {
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        :global(.channel-btn) {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--r-m);
          color: var(--muted);
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          text-align: left;
          transition: 0.15s;
        }
        :global(.channel-btn:hover) {
          background: color-mix(in srgb, var(--text) 4%, transparent);
          color: var(--text);
        }
        :global(.channel-btn.active) {
          background: rgba(56, 189, 248, 0.14);
          border-color: rgba(56, 189, 248, 0.3);
          color: var(--a2);
        }
        .channel-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-viewport {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: color-mix(in srgb, var(--bg1) 20%, transparent);
        }
        .chat-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--text) 2%, transparent);
        }
        .messages-stream {
          position: relative;
          flex: 1;
          overflow-y: auto;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        :global(.chat-bubble-wrap) {
          display: flex;
          flex-direction: column;
          align-self: flex-start;
          max-width: 75%;
          gap: 4px;
        }
        :global(.chat-bubble-wrap.mine) {
          align-self: flex-end;
        }
        .bubble-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
        }
        :global(.chat-bubble-wrap.mine) .bubble-head {
          justify-content: flex-end;
        }
        .bubble-author {
          font-weight: 700;
          color: var(--a2);
        }
        .bubble-time {
          color: var(--muted);
          font-family: var(--font-mono);
        }
        .bubble-body {
          padding: 10px 14px;
          border-radius: var(--r-m);
          background: color-mix(in srgb, var(--text) 6%, transparent);
          border: 1px solid var(--border);
          font-size: 0.88rem;
          line-height: 1.45;
          word-break: break-word;
        }
        :global(.chat-bubble-wrap.mine) .bubble-body {
          background: linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(99, 102, 241, 0.35));
          border-color: rgba(56, 189, 248, 0.4);
        }
        .bubble-actions {
          display: flex;
          gap: 6px;
        }
        .action-btn-mini {
          display: flex;
          align-items: center;
          gap: 4px;
          background: color-mix(in srgb, var(--text) 4%, transparent);
          border: 1px solid var(--border);
          border-radius: var(--r-s);
          color: var(--muted);
          font-size: 0.7rem;
          padding: 2px 8px;
          cursor: pointer;
        }
        .action-btn-mini.liked {
          color: var(--a2);
          border-color: var(--a2);
        }
        .action-btn-mini.del:hover {
          color: var(--err);
          border-color: var(--err);
        }
        .chat-input-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg1) 35%, transparent);
        }
        .chat-input-field {
          flex: 1;
        }
        .chat-viewport { min-height: 0; }
        :global(.back-btn) { padding: 6px 10px; font-size: .75rem; gap: 6px; flex-shrink: 0; }
        @media (max-width: 420px) { :global(.back-btn) span { display: none; } }
        @media (max-width: 768px) {
          .rooms-container {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, 1fr);
            height: min(640px, calc(100dvh - 190px));
            min-height: 460px;
          }
          /* HP: daftar channel tampil sebagai strip horizontal di atas chat */
          .rooms-sidebar {
            flex-direction: row;
            align-items: center;
            border-right: none;
            border-bottom: 1px solid var(--border);
            min-width: 0;
          }
          .sidebar-head { padding: 0 6px 0 14px; border-bottom: none; flex-shrink: 0; }
          .sidebar-head span { display: none; }
          .channels-list {
            flex-direction: row;
            gap: 6px;
            padding: 8px 12px 8px 4px;
            overflow-x: auto;
            overflow-y: hidden;
            min-width: 0;
            flex: 1;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .channels-list::-webkit-scrollbar { display: none; }
          :global(.channel-btn) { flex-shrink: 0; padding: 8px 12px; border-radius: var(--r-chip, 8px); border-color: var(--border); }
          :global(.channel-btn:hover) { transform: none; }
          .channel-name { max-width: 110px; }
          :global(.chat-bubble-wrap) { max-width: 88%; }
          .chat-top-bar { padding: 10px 14px; }
          .messages-stream { padding: 14px; }
          .chat-input-bar { padding: 10px 12px; }
        }
      `}</style>
    </>
  );
}