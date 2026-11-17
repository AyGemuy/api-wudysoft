import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import Modal from '@/components/Modal';
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
  ArrowRight
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function RoomsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Room List
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setRooms(json.data);
      } else {
        setRooms([{ roomName: 'general', isGroup: true }]);
      }
    } catch {
      setRooms([{ roomName: 'general', isGroup: true }]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // 2. Fetch Messages from Active Room
  const fetchMessages = async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/rooms?roomName=${encodeURIComponent(activeRoom)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMessages(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, 3500); // Polling realtime
    return () => clearInterval(timer);
  }, [activeRoom]);

  // Gulir ke bawah hanya saat ada pesan baru / ganti channel (polling 3,5 dtk tidak menyentak scroll)
  const lastMsgRef = useRef({ room: null, id: null });
  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1]._id : null;
    const prev = lastMsgRef.current;
    if (prev.room !== activeRoom || prev.id !== lastId) {
      lastMsgRef.current = { room: activeRoom, id: lastId };
      scrollToBottom();
    }
  }, [messages, activeRoom]);

  // Channel aktif selalu terlihat di daftar horizontal (mobile)
  const channelsRef = useRef(null);
  useEffect(() => {
    const el = channelsRef.current?.querySelector('.channel-btn.active');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeRoom, rooms]);

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
        sound.playBeep();
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
        }),
      });

      const json = await res.json();
      if (json.success) {
        sound.playBeep();
        setNewRoomName('');
        setCreateModal(false);
        fetchRooms();
        setActiveRoom(json.data.roomName);
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
    if (!confirm('Hapus pesan ini dari cluster?')) return;
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
      <Seo title="Cyber Rooms" path="/rooms" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="badge ok" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--a2)" />
              <span>COMMUNICATION MESH NETWORK</span>
            </div>
            <h1>Cyber Rooms & Mesh Chat</h1>
            <p>Saluran komunikasi terenkripsi antar-node cluster.</p>
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
        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Buat Group Channel" icon={<Users size={18} color="var(--a2)" />} maxWidth="440px">
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
            <motion.button type="submit" className="btn primary full" whileTap={{ scale: 0.98 }}>
              Inisialisasi Channel
            </motion.button>
          </form>
        </Modal>

        {/* Chat Layout Box */}
        <div className="rooms-container glass">
          {/* Daftar channel: sidebar di desktop, strip horizontal di mobile */}
          <aside className="rooms-sidebar" aria-label="Daftar channel">
            <div className="sidebar-head">
              <MessageSquare size={16} color="var(--a2)" />
              <span>ACTIVE CHANNELS</span>
              <span className="sidebar-count">{rooms.length}</span>
              <button
                type="button"
                className="sidebar-add"
                aria-label="Buat channel baru"
                onClick={() => {
                  sound.playClick();
                  setCreateModal(true);
                }}
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="channels-list" ref={channelsRef} role="tablist" aria-label="Channel">
              {loadingRooms && rooms.length === 0
                ? [0, 1, 2].map((i) => <div key={i} className="skeleton channel-skeleton" />)
                : rooms.map((r) => {
                    const isActive = activeRoom === r.roomName;
                    return (
                      <motion.button
                        key={r.roomName}
                        role="tab"
                        aria-selected={isActive}
                        className={`channel-btn ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          sound.playClick();
                          setActiveRoom(r.roomName);
                        }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Hash size={16} color={isActive ? 'var(--a2)' : 'var(--muted)'} />
                        <span className="channel-name">{r.roomName}</span>
                      </motion.button>
                    );
                  })}
            </div>
          </aside>

          {/* Main Chat Stream */}
          <section className="chat-viewport">
            {/* Active Header */}
            <div className="chat-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={18} color="var(--a2)" />
                <strong style={{ fontSize: '1rem', textTransform: 'uppercase' }}>{activeRoom}</strong>
              </div>
              <button onClick={fetchMessages} className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Message History */}
            <div className="messages-stream">
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
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
      </div>

      <style jsx>{`
        .rooms-container {
          display: grid;
          grid-template-columns: 240px 1fr;
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
          border-radius: 12px;
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
          background: color-mix(in srgb, var(--a2) 14%, transparent);
          border-color: color-mix(in srgb, var(--a2) 32%, transparent);
          color: var(--a2);
        }
        :global(.channel-skeleton) {
          height: 40px;
          border-radius: 12px;
          flex: 0 0 auto;
          min-width: 110px;
        }
        .sidebar-count {
          margin-left: auto;
          padding: 1px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--text) 8%, transparent);
          font-size: 0.7rem;
        }
        .sidebar-add {
          display: none;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--text) 4%, transparent);
          color: var(--a2);
          cursor: pointer;
          flex-shrink: 0;
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
          border-radius: 16px;
          background: color-mix(in srgb, var(--text) 6%, transparent);
          border: 1px solid var(--border);
          font-size: 0.88rem;
          line-height: 1.45;
          word-break: break-word;
        }
        :global(.chat-bubble-wrap.mine) .bubble-body {
          background: color-mix(in srgb, var(--a2) 18%, transparent);
          border-color: color-mix(in srgb, var(--a2) 45%, transparent);
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
          border-radius: 8px;
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
          color: #f87171;
          border-color: #f87171;
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
        @media (max-width: 768px) {
          .rooms-container {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto minmax(0, 1fr);
            height: min(640px, calc(100dvh - 190px));
            min-height: 440px;
          }
          /* Daftar group tampil sebagai strip horizontal di atas chat */
          .rooms-sidebar {
            display: flex;
            flex-direction: column;
            border-right: none;
            border-bottom: 1px solid var(--border);
            min-width: 0;
          }
          .sidebar-head {
            padding: 10px 12px 6px;
            border-bottom: none;
          }
          .sidebar-add {
            display: inline-flex;
          }
          .sidebar-count {
            margin-left: 0;
          }
          .sidebar-head .sidebar-add {
            margin-left: auto;
          }
          .channels-list {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 4px 12px 12px;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
          }
          .channels-list::-webkit-scrollbar {
            display: none;
          }
          :global(.channel-btn) {
            flex: 0 0 auto;
            max-width: 180px;
            scroll-snap-align: center;
            border-color: var(--border);
            padding: 8px 14px;
            border-radius: 999px;
            min-height: 40px;
          }
          :global(.channel-btn:hover) {
            transform: none;
          }
          .chat-top-bar {
            padding: 10px 12px;
          }
          .messages-stream {
            padding: 12px;
          }
          :global(.chat-bubble-wrap) {
            max-width: 90%;
          }
          .chat-input-bar {
            padding: 10px 12px calc(10px + var(--safe-bottom, 0px) * 0);
          }
        }
      `}</style>
    </>
  );
}