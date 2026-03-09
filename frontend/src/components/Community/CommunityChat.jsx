import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

// ─── DOMAIN CONFIG ────────────────────────────────────────────────────────────
const DOMAIN_CONFIG = {
  "agriculture": { label: "Agriculture", icon: "🌾", color: "#6db86d", accent: "#4a8c4a" },
  "health":      { label: "Health",      icon: "🏥", color: "#7ab87a", accent: "#4e8f4e" },
  "art-craft":   { label: "Art & Craft", icon: "🎨", color: "#c4922a", accent: "#9b6b2f" },
};

const EMOJIS = ["🙏","🌿","🔥","❤️","✨","🎯"];
const generateId = () => Math.random().toString(36).substr(2, 9);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const colorFor = (emailOrName) => {
  const p = ['#c4922a','#6db86d','#7ab87a','#d4ab63','#9b6b2f','#c19a6b'];
  let h = 0; for (const c of (emailOrName||'')) h = c.charCodeAt(0)+((h<<5)-h);
  return p[Math.abs(h)%p.length];
};

const resolveUser = (u) => {
  if (!u) return { name: 'Unknown', email: '' };
  if (typeof u === 'string') return { name: u, email: '' };
  return { name: u.name || 'Unknown', email: u.email || '' };
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (ts) => {
  const d = new Date(ts), t = new Date();
  if (d.toDateString() === t.toDateString()) return 'Today';
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
};

const parseMsg = (msg) => {
  let text = msg.text || '';
  let image = msg.image || null;
  const imgMatch = text.match(/^__IMG__(.+?)__ENDIMG__([\s\S]*)$/);
  if (imgMatch) {
    image = imgMatch[1];
    text  = imgMatch[2];
  }
  const topicMatch = text.match(/^__TOPIC__([^_]+)__(.+?)__END__([\s\S]*)$/);
  
  let result = { ...msg, image, text };
  if (topicMatch) {
    result = { ...result, topic: { domain: topicMatch[1], label: topicMatch[2] }, text: topicMatch[3] };
  }
  return result;
};

// ─── SUB-COMPONENTS (Avatar, Badge, Bars, etc) ────────────────────────────────
const Avatar = ({ name, email, size=28 }) => (
  <div style={{
    width:size, height:size, borderRadius:'50%', flexShrink:0,
    background: colorFor(email || name),
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'IM Fell DW Pica',serif", fontSize: size*0.44,
    color:'#1c0d04', fontWeight:'bold',
  }}>
    {(name||'?')[0].toUpperCase()}
  </div>
);

const TopicBadge = ({ topic, compact }) => {
  if (!topic || !DOMAIN_CONFIG[topic.domain]) return null;
  const cfg = DOMAIN_CONFIG[topic.domain];
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background:`${cfg.color}18`, border:`1px solid ${cfg.color}40`,
      borderRadius:4, padding: compact ? '2px 6px' : '3px 10px', marginBottom: compact ? 4 : 6,
    }}>
      <span style={{ fontSize: compact ? 10 : 11 }}>{cfg.icon}</span>
      <span style={{
        fontFamily:"'Space Mono',monospace", fontSize: compact ? 9 : 10,
        color: cfg.accent, letterSpacing:'0.05em', fontWeight:700,
        textTransform:'uppercase', maxWidth:200, overflow:'hidden',
        textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>{topic.label}</span>
    </div>
  );
};

const ReactionBar = ({ reactions, messageId, currentUserEmail, onReact }) => {
  const counts = {};
  reactions.forEach(r => {
    if (!counts[r.emoji]) counts[r.emoji] = { count:0, users:[] };
    counts[r.emoji].count += r.users.length;
    counts[r.emoji].users.push(...r.users);
  });
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
      {Object.entries(counts).map(([emoji, { count, users }]) => {
        const mine = users.includes(currentUserEmail);
        return (
          <motion.button key={emoji} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            onClick={() => onReact(messageId, emoji)}
            style={{
              background: mine ? 'rgba(196,146,42,0.2)' : 'rgba(0,0,0,0.06)',
              border: mine ? '1px solid rgba(196,146,42,0.5)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius:12, padding:'2px 8px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:4,
            }}>
            <span style={{ fontSize:13 }}>{emoji}</span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color: mine ? '#9b6b2f' : '#7b6b5a' }}>{count}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

const ReplyThread = ({ replies, currentUserEmail, onReact }) => {
  if (!replies?.length) return null;
  return (
    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(196,146,42,0.15)' }}>
      {replies.map((r, i) => {
        const ru = resolveUser(r.user);
        return (
          <motion.div key={r.id||i}
            initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
            style={{ display:'flex', gap:8, marginBottom:8, paddingLeft:12, borderLeft:'2px solid rgba(196,146,42,0.25)' }}>
            <Avatar name={ru.name} email={ru.email} size={22} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:2 }}>
                <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:12, fontWeight:700,
                  color: ru.email===currentUserEmail ? '#c4922a' : '#5a4a3a' }}>
                  {ru.email===currentUserEmail ? "You" : ru.name}
                </span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#9b8b7a', opacity:0.7 }}>
                  {formatTime(r.timestamp)}
                </span>
              </div>
              {r.image && <img src={r.image} alt="reply" style={{ maxHeight:120, borderRadius:4, border:'1px solid rgba(196,146,42,0.2)', marginBottom:4, display:'block' }} />}
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'#353535', lineHeight:1.5, margin:0 }}>{r.text}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const MessageCard = ({ msg, currentUserEmail, onReact, onReply, onDelete, resolveDisplayName }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const u = resolveUser(msg.user);
  const isMe = u.email === currentUserEmail;
  const displayName = resolveDisplayName ? resolveDisplayName(msg.user, isMe) : u.name;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const msgId = msg._id || msg.id;

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
        <Avatar name={u.name} email={u.email} size={26} />
        <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:13, fontWeight:700, color: isMe ? '#c4922a' : '#5a4a3a' }}>
          {isMe ? displayName : u.name}
        </span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#9b8b7a', opacity:0.7 }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
      
      {/* Global Reply Display */}
      {msg.replyTo && typeof msg.replyTo === 'object' && (
        <div style={{ maxWidth:'78%', marginBottom: 4, opacity: 0.85, transform: 'scale(0.95)', transformOrigin: isMe ? 'right bottom' : 'left bottom' }}>
          <ReplyPreviewStrip replyingTo={msg.replyTo} onClear={() => {}} />
        </div>
      )}

      <div ref={menuRef} onDoubleClick={() => setShowMenu(m => !m)}
        style={{
          position:'relative', maxWidth:'78%',
          background: isMe ? 'linear-gradient(135deg,rgba(196,146,42,0.12),rgba(155,107,47,0.08))' : 'linear-gradient(135deg,rgba(255,255,255,0.88),rgba(237,224,190,0.65))',
          border: isMe ? '1px solid rgba(196,146,42,0.3)' : '1px solid rgba(196,146,42,0.18)',
          borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
          padding:'10px 14px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', cursor:'default',
        }}>
        <TopicBadge topic={msg.topic} />
        {msg.image && <img src={msg.image} alt="attached" style={{ display:'block', maxHeight:220, maxWidth:'100%', borderRadius:6, marginBottom:6, border:'1px solid rgba(196,146,42,0.2)' }} />}
        {msg.text && <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#353535', lineHeight:1.6, margin:0, wordBreak:'break-word', whiteSpace:'pre-wrap' }}>{msg.text}</p>}
        <AnimatePresence>
          {showMenu && (
            <motion.div initial={{ opacity:0, scale:0.9, y:4 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }} onClick={e => e.stopPropagation()}
              style={{ position:'absolute', [isMe ? 'right' : 'left']:0, bottom:'calc(100% + 6px)', background:'#fdf6e3', border:'1px solid rgba(196,146,42,0.3)', borderRadius:8, padding:6, display:'flex', gap:4, boxShadow:'0 4px 16px rgba(0,0,0,0.14)', zIndex:10, flexWrap:'wrap', maxWidth:220 }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { onReact(msgId, e); setShowMenu(false); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, padding:'2px 4px', borderRadius:4, transition:'transform 0.1s' }} onMouseEnter={ev => ev.target.style.transform='scale(1.3)'} onMouseLeave={ev => ev.target.style.transform='scale(1)'}>{e}</button>
              ))}
              <div style={{ width:'100%', height:1, background:'rgba(196,146,42,0.15)', margin:'2px 0' }} />
              <button onClick={() => { onReply(msg); setShowMenu(false); }} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Space Mono',monospace", fontSize:9, color:'#9b6b2f', letterSpacing:'0.05em', padding:'2px 4px' }}>↩ REPLY</button>
              {isMe && <button onClick={() => { onDelete(msgId); setShowMenu(false); }} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'Space Mono',monospace", fontSize:9, color:'#c0392b', letterSpacing:'0.05em', padding:'2px 4px' }}>✕ DELETE</button>}
              <button onClick={() => setShowMenu(false)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontFamily:"'Space Mono',monospace", fontSize:9, color:'#9b8b7a', padding:'2px 4px' }}>ESC</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {msg.reactions?.length > 0 && <div style={{ maxWidth:'78%', marginTop:2 }}><ReactionBar reactions={msg.reactions} messageId={msgId} currentUserEmail={currentUserEmail} onReact={onReact} /></div>}
    </motion.div>
  );
};

const TopicModal = ({ isOpen, onClose, onSelect, domainData }) => {
  const [activeTab, setActiveTab] = useState(Object.keys(DOMAIN_CONFIG)[0]);
  const [search, setSearch]       = useState('');
  if (!isOpen) return null;
  const allEntries = [];
  if (domainData?.[activeTab]) Object.values(domainData[activeTab]).forEach(items => items.forEach(item => allEntries.push(item)));
  const filtered = allEntries.filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <motion.div initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }} onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:520, maxHeight:'80vh', background:'linear-gradient(to bottom,#f5f0e1,#ede0be)', border:'2px solid rgba(196,146,42,0.3)', borderRadius:8, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(196,146,42,0.2)', background:'linear-gradient(to bottom,#ede0be,#e4d4a8)' }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#c4922a', letterSpacing:'0.15em', marginBottom:4 }}>🌿 LINK A KNOWLEDGE ENTRY</div>
          <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:22, color:'#2a1a08' }}>Attach Topic to Message</div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." style={{ marginTop:10, width:'100%', padding:'8px 12px', border:'1px solid rgba(196,146,42,0.3)', borderRadius:4, fontFamily:"'Cormorant Garamond',serif", fontSize:14, background:'rgba(255,255,255,0.7)', outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'flex', borderBottom:'1px solid rgba(196,146,42,0.2)', background:'rgba(196,146,42,0.06)' }}>
          {Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex:1, padding:'10px 4px', border:'none', cursor:'pointer', background: activeTab===key ? 'rgba(196,146,42,0.15)' : 'none', borderBottom: activeTab===key ? `2px solid ${cfg.color}` : '2px solid transparent', fontFamily:"'IM Fell DW Pica',serif", fontSize:13, color: activeTab===key ? cfg.accent : '#7b6b5a', transition:'all 0.2s' }}>{cfg.icon} {cfg.label}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {filtered.length === 0 && <div style={{ textAlign:'center', padding:24, fontFamily:"'IM Fell DW Pica',serif", color:'#9b8b7a', fontSize:14 }}>No entries found</div>}
          {filtered.map((item, i) => (
            <motion.button key={item.id||i} whileHover={{ x:4, background:'rgba(196,146,42,0.1)' }} onClick={() => { onSelect({ domain:activeTab, label:item.title }); onClose(); }} style={{ display:'block', width:'100%', padding:'10px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid rgba(196,146,42,0.08)', transition:'all 0.15s' }}><div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:14, color:'#2a1a08' }}>{item.title}</div>{item.description && <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:12, color:'#7b6b5a', marginTop:2 }}>{item.description}</div>}</motion.button>
          ))}
        </div>
        <div style={{ padding:'10px 24px', borderTop:'1px solid rgba(196,146,42,0.15)', textAlign:'right' }}><button onClick={onClose} style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#9b8b7a', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.1em' }}>✕ CLOSE</button></div>
      </motion.div>
    </motion.div>
  );
};

const ImagePreviewStrip = ({ preview, onClear }) => (
  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ padding:'8px 16px', borderTop:'1px solid rgba(196,146,42,0.15)' }}>
    <div style={{ position:'relative', display:'inline-block' }}>
      <img src={preview} alt="preview" style={{ height:64, borderRadius:4, border:'1px solid rgba(196,146,42,0.3)', display:'block' }} />
      <button onClick={onClear} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, background:'#c0392b', color:'white', border:'none', borderRadius:'50%', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
    </div>
  </motion.div>
);

const AttachedTopicStrip = ({ topic, onClear }) => (
  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ padding:'6px 16px', borderTop:'1px solid rgba(196,146,42,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between', background:`${DOMAIN_CONFIG[topic.domain]?.color || '#c4922a'}0a` }}>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:12 }}>{DOMAIN_CONFIG[topic.domain]?.icon}</span>
      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color: DOMAIN_CONFIG[topic.domain]?.accent || '#9b6b2f', letterSpacing:'0.05em' }}>DISCUSSING: {topic.label}</span>
    </div>
    <button onClick={onClear} style={{ background:'none', border:'none', cursor:'pointer', color:'#9b8b7a', fontSize:12 }}>✕</button>
  </motion.div>
);

const ReplyPreviewStrip = ({ replyingTo, onClear }) => {
  const u = resolveUser(replyingTo?.user);
  if (!replyingTo) return null;
  
  let displayText = replyingTo.text || "";
  let imageUrl = replyingTo.image || null;
  
  if (typeof replyingTo.text === 'string') {
    const topicMatch = replyingTo.text.match(/^__TOPIC__([^_]+)__(.+?)__END__([\s\S]*)$/);
    if (topicMatch) displayText = topicMatch[3];
    
    const imgMatch = displayText.match(/^__IMG__(.+?)__ENDIMG__([\s\S]*)$/);
    if (imgMatch) {
      if (!imageUrl) imageUrl = imgMatch[1];
      displayText = imgMatch[2].trim();
    }
  }
  
  return (
    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ padding:'8px 16px', borderTop: onClear ? '1px solid rgba(196,146,42,0.2)' : 'none', background: onClear ? 'rgba(196,146,42,0.06)' : 'transparent', display:'flex', alignItems:'center', gap:10, borderRadius: 6, border: onClear ? 'none' : '1px solid rgba(196,146,42,0.15)', overflow: 'hidden' }}>
      <div style={{ width:2, height:32, background:'#c4922a', borderRadius:1, flexShrink:0 }} />
      {imageUrl && (
        <img src={imageUrl} alt="preview" style={{ height:32, width:32, objectFit:'cover', borderRadius:4, border:'1px solid rgba(196,146,42,0.3)' }} />
      )}
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#c4922a', letterSpacing:'0.08em' }}>↩ REPLYING TO {u.name.toUpperCase()}</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'#7b6b5a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {displayText || (imageUrl ? "Attached Image" : "")}
        </div>
      </div>
      {onClear ? <button onClick={onClear} style={{ background:'none', border:'none', cursor:'pointer', color:'#9b8b7a' }}>✕</button> : null}
    </motion.div>
  );
};

// ─── MAIN COMMUNITY CHAT ──────────────────────────────────────────────────────
const CommunityChat = ({ domainData }) => {
  const { user, token } = useAuth();
  const currentUserEmail = user?.email || '';
  const currentUserName  = user?.name  || 'You';

  // Override name in message for display: if it's the current user and the stored name
  // looks like an email prefix (old messages), show their actual name instead.
  const resolveDisplayName = (u, isMe) => {
    if (isMe && user?.name) return user.name;
    return resolveUser(u).name;
  };

  const [messages,        setMessages]       = useState([]);
  const [localReactions,  setLocalReactions] = useState({});
  const [localReplies,    setLocalReplies]   = useState({});
  const [inputText,       setInputText]      = useState('');
  const [imageFile,       setImageFile]      = useState(null);
  const [imagePreview,    setImagePreview]   = useState(null);
  const [attachedTopic,   setAttachedTopic]  = useState(null);
  const [replyingTo,      setReplyingTo]     = useState(null);
  const [isTopicModalOpen,setTopicModalOpen] = useState(false);
  const [connected,       setConnected]      = useState(false);
  const [onlineCount,     setOnlineCount]    = useState(0);
  const [error,           setError]          = useState('');

  const scrollRef    = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef     = useRef(null);
  const socketRef    = useRef(null);

  useEffect(() => {
    if (!token) return;
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const socket = io(BACKEND, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on('connect', () => { setConnected(true); setError(''); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:history', (msgs) => {
      setMessages(msgs.map(m => ({ ...parseMsg(m), reactions:[], replies:[] })));
    });
    socket.on('chat:message', (msg) => {
      setMessages(prev => [...prev, { ...parseMsg(msg), reactions:[], replies:[] }]);
    });
    socket.on('chat:online', n => setOnlineCount(n));
    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, localReactions, localReplies]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageFile(file);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !imageFile && !attachedTopic) return;
    if (!connected || !socketRef.current) return;

    let imageUrl = null;
    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${BACKEND}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.url; 
        }
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    }

    let txt = inputText.trim();
    if (attachedTopic) txt = `__TOPIC__${attachedTopic.domain}__${attachedTopic.label}__END__${txt}`;
    if (imageUrl) txt = `__IMG__${imageUrl}__ENDIMG__${txt}`;
    
    // Global emit (object payload)
    if (txt || imageUrl) {
      if (replyingTo) {
        const parentId = replyingTo._id || replyingTo.id;
        socketRef.current.emit('chat:message', { text: txt, replyTo: parentId });
        setReplyingTo(null);
      } else {
        socketRef.current.emit('chat:message', { text: txt });
      }
    }

    setInputText(''); setImageFile(null); setImagePreview(null); setAttachedTopic(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    inputRef.current?.focus();
  };

  const handleReact = (msgId, emoji) => {
    setLocalReactions(prev => {
      const existing = [...(prev[msgId] || [])];
      const idx = existing.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const already = existing[idx].users.includes(currentUserEmail);
        if (already) existing[idx] = { ...existing[idx], users: existing[idx].users.filter(u => u !== currentUserEmail) };
        else existing[idx] = { ...existing[idx], users: [...existing[idx].users, currentUserEmail] };
        return { ...prev, [msgId]: existing.filter(r => r.users.length > 0) };
      }
      return { ...prev, [msgId]: [...existing, { emoji, users:[currentUserEmail] }] };
    });
  };

  const handleDelete = (msgId) => {
    if (socketRef.current) socketRef.current.emit('delete-message', { messageId:msgId, userId:user?._id });
    setMessages(prev => prev.filter(m => (m._id || m.id) !== msgId));
  };

  const grouped = messages.map(msg => ({
    ...msg,
    reactions: localReactions[msg._id || msg.id] || []
  })).reduce((acc, msg) => {
    const k = fmtDate(msg.timestamp);
    if (!acc[k]) acc[k] = [];
    acc[k].push(msg); return acc;
  }, {});

  const canSend = (inputText.trim() || imageFile || attachedTopic) && connected;

  return (
    <>
      <AnimatePresence>{isTopicModalOpen && <TopicModal isOpen={isTopicModalOpen} onClose={() => setTopicModalOpen(false)} onSelect={setAttachedTopic} domainData={domainData} />}</AnimatePresence>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', width:'100%', maxWidth:'100vw', boxSizing:'border-box', background:'linear-gradient(to bottom,#f8f2e0,#f0e8d0)', border:'1px solid rgba(196,146,42,0.25)', borderRadius:6, boxShadow:'0 4px 24px rgba(0,0,0,0.14)', overflow:'hidden', fontFamily:"'Cormorant Garamond',serif", position:'relative' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, opacity:0.3, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")" }} />
        <div style={{ padding:'14px 20px', zIndex:1, borderBottom:'1px solid rgba(196,146,42,0.2)', background:'linear-gradient(to bottom,#ede0be,#e4d4a8)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div><div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#c4922a', letterSpacing:'0.2em', marginBottom:2 }}>🌿 COMMUNITY CIRCLE</div><div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, color:'#2a1a08' }}>Living Memory — Open Discourse</div></div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:"'Space Mono',monospace", fontSize:9, color:'#9b8b7a' }}><div style={{ width:6, height:6, borderRadius:'50%', background: connected ? '#6db86d' : '#d05e52', boxShadow: `0 0 6px ${connected ? '#6db86d' : '#d05e52'}` }} />{connected ? `${onlineCount} scholars online` : 'reconnecting...'}</div>
        </div>
        <div style={{ padding:'6px 20px', zIndex:1, borderBottom:'1px solid rgba(196,146,42,0.1)', background:'rgba(196,146,42,0.04)', display:'flex', alignItems:'center', gap:8 }}><Avatar name={currentUserName} email={currentUserEmail} size={20} /><span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'rgba(92,51,23,0.5)', letterSpacing:'0.05em' }}>Signed in as <span style={{ color:'rgba(92,51,23,0.8)' }}>{currentUserName}</span></span></div>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'20px 24px', zIndex:1, scrollbarWidth:'thin', scrollbarColor:'rgba(196,146,42,0.3) transparent' }}>
          {messages.length === 0 && connected && <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, paddingTop:40, textAlign:'center' }}><div style={{ fontSize:40 }}>🌿</div><div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:18, color:'rgba(155,107,47,0.45)', fontStyle:'italic' }}>Be the first to share wisdom today</div></div>}
          {Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'14px 0 10px', fontFamily:"'Space Mono',monospace", fontSize:8, letterSpacing:'.15em', color:'rgba(155,107,47,0.4)', textTransform:'uppercase' }}><div style={{ flex:1, borderTop:'1px solid rgba(155,107,47,0.15)' }}/><span style={{ background:'rgba(196,146,42,0.07)', border:'1px solid rgba(196,146,42,0.15)', borderRadius:20, padding:'2px 10px' }}>{date}</span><div style={{ flex:1, borderTop:'1px solid rgba(155,107,47,0.15)' }}/></div>
              {msgs.map((msg, i) => <MessageCard key={msg._id || msg.id} msg={msg} currentUserEmail={currentUserEmail} onReact={handleReact} onReply={setReplyingTo} onDelete={handleDelete} resolveDisplayName={resolveDisplayName} prevSame={i > 0 && msgs[i - 1]?.user?.email === msg.user?.email} />)}
            </div>
          ))}
        </div>
        <div style={{ zIndex:1, borderTop:'2px solid rgba(196,146,42,0.15)', background:'linear-gradient(to top,#ede0be,#f0e8d0)' }}>
          <AnimatePresence>{replyingTo && <ReplyPreviewStrip replyingTo={replyingTo} onClear={() => setReplyingTo(null)} />}</AnimatePresence>
          <AnimatePresence>{attachedTopic && <AttachedTopicStrip topic={attachedTopic} onClear={() => setAttachedTopic(null)} />}</AnimatePresence>
          <AnimatePresence>{imagePreview && <ImagePreviewStrip preview={imagePreview} onClear={() => { setImageFile(null); setImagePreview(null); }} />}</AnimatePresence>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px' }}>
            <label title="Attach image" style={{ cursor:'pointer', color:'#9b8b7a', transition:'color 0.2s', flexShrink:0 }} onMouseEnter={e => e.currentTarget.style.color='#c4922a'} onMouseLeave={e => e.currentTarget.style.color='#9b8b7a'}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display:'none' }} /></label>
            <button title="Link a knowledge entry" onClick={() => setTopicModalOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', flexShrink:0, color: attachedTopic ? '#c4922a' : '#9b8b7a', transition:'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#c4922a'} onMouseLeave={e => e.currentTarget.style.color= attachedTopic ? '#c4922a' : '#9b8b7a'}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            <div style={{ width:1, height:20, background:'rgba(196,146,42,0.2)', flexShrink:0 }} />
            <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={!connected ? "Reconnecting..." : replyingTo ? `Reply to ${resolveUser(replyingTo.user).name}...` : attachedTopic ? `Speak about ${attachedTopic.label}...` : "Share your wisdom with the circle..."} disabled={!connected} style={{ flex:1, minWidth:0, background:'transparent', border:'none', outline:'none', fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'#353535', opacity: connected ? 1 : 0.5 }} />
            <motion.button whileTap={{ scale:0.93 }} onClick={handleSend} disabled={!canSend} style={{ background: canSend ? 'linear-gradient(135deg,#c4922a,#9b6b2f)' : 'rgba(196,146,42,0.2)', border:'none', borderRadius:6, padding:'8px 16px', cursor: canSend ? 'pointer' : 'not-allowed', fontFamily:"'Space Mono',monospace", fontSize:10, color: canSend ? '#fff' : '#9b8b7a', letterSpacing:'0.1em', fontWeight:700, transition:'all 0.2s', boxShadow: canSend ? '0 2px 8px rgba(196,146,42,0.3)' : 'none' }}>SEND</motion.button>
          </div>
          <div style={{ padding:'4px 16px 8px', fontFamily:"'Space Mono',monospace", fontSize:8, color:'rgba(155,107,47,0.4)', letterSpacing:'0.08em', display:'flex', gap:16 }}><span>🌿 double-tap any message to react</span><span>📎 link knowledge entries with the chain icon</span></div>
        </div>
      </div>
    </>
  );
};

export default CommunityChat;