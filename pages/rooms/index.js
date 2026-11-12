import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
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
      <Seo title="Cyber Comms Room" path="/rooms" />

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

        {/* Chat Layout Box */}
        <div className="rooms-container glass">
          {/* Sidebar Channels */}
          <aside className="rooms-sidebar">
            <div className="sidebar-head">
              <MessageSquare size={16} color="var(--a2)" />
              <span>ACTIVE CHANNELS</span>
            </div>

            <div className="channels-list">
              {rooms.map((r) => {
                const isActive = activeRoom === r.roomName;
                return (
                  <motion.button
                    key={r.roomName}
                    className={`channel-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      sound.playClick();
                      setActiveRoom(r.roomName);
                    }}
                    whileHover={{ x: 4 }}
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
          height: 620px;
          border-radius: var(--radius);
          overflow: hidden;
        }
        .rooms-sidebar {
          background: rgba(0, 0, 0, 0.35);
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
        .channel-btn {
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
        .channel-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
        }
        .channel-btn.active {
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
          background: rgba(0, 0, 0, 0.2);
        }
        .chat-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }
        .messages-stream {
          flex: 1;
          overflow-y: auto;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .chat-bubble-wrap {
          display: flex;
          flex-direction: column;
          align-self: flex-start;
          max-width: 75%;
          gap: 4px;
        }
        .chat-bubble-wrap.mine {
          align-self: flex-end;
        }
        .bubble-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
        }
        .chat-bubble-wrap.mine .bubble-head {
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
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border);
          font-size: 0.88rem;
          line-height: 1.45;
          word-break: break-word;
        }
        .chat-bubble-wrap.mine .bubble-body {
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
          background: rgba(255, 255, 255, 0.04);
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
          background: rgba(0, 0, 0, 0.35);
        }
        .chat-input-field {
          flex: 1;
        }
        @media (max-width: 768px) {
          .rooms-container {
            grid-template-columns: 1fr;
            height: 580px;
          }
          .rooms-sidebar {
            display: none; /* Di mobile chat stream full width */
          }
        }
      `}</style>
    </>
  );
}