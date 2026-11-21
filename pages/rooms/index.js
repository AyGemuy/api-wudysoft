import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import RoomPicker, { GroupAvatar } from '@/components/rooms/RoomPicker';
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
  ArrowLeft
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

  const messagesEndRef = useRef(null);
  const prevCount = useRef(null);

  // Gulir hanya area pesan (scrollIntoView menggulir seluruh halaman → di HP loncat ke footer)
  const streamRef = useRef(null);
  const scrollToBottom = () => {
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  // Buka / tutup grup; ?room= menjaga pilihan saat refresh & bisa dibagikan
  const openRoom = (r) => {
    setMessages([]);
    prevCount.current = null;
    setActiveMeta(r || null);
    router.push({ pathname: '/rooms', query: r ? { room: r.roomName } : {} }, undefined, { shallow: true, scroll: false });
  };

  // 2. Fetch Messages from Active Room
  const fetchMessages = async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/rooms?roomName=${encodeURIComponent(activeRoom)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // suara pesan masuk dari orang lain (bukan saat pertama memuat)
        const prev = prevCount.current;
        const last = json.data[json.data.length - 1];
        const mine = last && user && (user.id === last.userId || user.name === last.name);
        if (prev !== null && json.data.length > prev && last && !mine) sound.fx('receive');
        prevCount.current = json.data.length;
        setMessages(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    if (!activeRoom) return undefined;
    fetchMessages();
    const timer = setInterval(fetchMessages, 3500); // Polling realtime
    return () => clearInterval(timer);
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    if (!user) {
      sound.playClick();
      signIn('guest');
      return;
    }

    sound.playClick();
    setSending(true);
    const textToSend = inputMsg;
    setInputMsg('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          roomName: activeRoom,
          name: user.name || 'Operative',
          userId: user.id || 'guest_user',
          avatar: user.image || '',
          message: textToSend,
        }),
      });

      if (res.ok) {
        sound.fx('send');
        fetchMessages();
      }
    } catch {
      setInputMsg(textToSend);
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
        setNewRoomName('');
        setCreateModal(false);
        setListKey((k) => k + 1);
        openRoom(json.data);
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // 5. Toggle Like
  const handleToggleLike = async (messageId) => {
    if (!user) return signIn('guest');
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
    if (!confirm('Hapus pesan ini?')) return;
    sound.playClick();
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteMessage',
          roomName: activeRoom,
          messageId,
        }),
      });
      fetchMessages();
    } catch {}
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
          <section className="chat-viewport">
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
            <div className="messages-stream" ref={streamRef}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Belum ada transmisi pesan di channel #{activeRoom}. Mulai percakapan pertama!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = user && (user.id === msg.userId || user.name === msg.name);
                  return (
                    <motion.div
                      key={msg._id}
                      className={`chat-bubble-wrap ${isMe ? 'mine' : ''}`}
                      layout="position"
                      initial={{ opacity: 0, x: isMe ? 28 : -28, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      style={{ transformOrigin: isMe ? 'right bottom' : 'left bottom' }}
                    >
                      <div className="bubble-head">
                        <span className="bubble-author">{msg.name}</span>
                        <span className="bubble-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="bubble-body">
                        <p>{msg.message}</p>
                      </div>

                      <div className="bubble-actions">
                        <button
                          className={`action-btn-mini ${msg.likes?.includes(user?.id) ? 'liked' : ''}`}
                          onClick={() => handleToggleLike(msg._id)}
                        >
                          <ThumbsUp size={12} /> {msg.likes?.length || 0}
                        </button>

                        {isMe && (
                          <button className="action-btn-mini del" onClick={() => handleDeleteMessage(msg._id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                className="input chat-input-field"
                placeholder={user ? `Kirim pesan ke #${activeRoom}…` : 'Masuk terlebih dahulu untuk mengirim pesan…'}
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={sending}
              />
              <motion.button
                type="submit"
                className="btn primary"
                disabled={sending || !inputMsg.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ padding: '12px 18px', borderRadius: '14px' }}
              >
                <Send size={16} />
              </motion.button>
            </form>
          </section>
        </div>
        </motion.div>
        )}
        </>
      </div>

      <style jsx>{`
        .rooms-container {
          display: grid;
          grid-template-columns: 1fr;
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
            grid-template-columns: 1fr;
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