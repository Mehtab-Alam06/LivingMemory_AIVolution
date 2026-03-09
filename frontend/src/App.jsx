import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import domainData from "./data/domainData.json";
import {
  sampleKnowledge,
  sampleAnalysis,
  getChatResponse,
} from "./data/knowledgedata.js";
import PaperCard from "./components/PaperCard";
import StickyNote from "./components/StickyNote";
import AuthPage from "./components/Auth/AuthPage";
import ProfileModal from "./components/Auth/ProfileModal";
import CommunityChat from "./components/Community/CommunityChat";
import { useAuth } from "./context/AuthContext";

const DOMAIN_CONFIG = {
  agriculture: {
    label: "Agriculture",
    icon: "🌾",
    color: "#6db86d",
    cls: "agri",
  },
  health: { label: "Health", icon: "🏥", color: "#7ab87a", cls: "health" },
  "art-craft": {
    label: "Art & Craft",
    icon: "🎨",
    color: "#c4922a",
    cls: "craft",
  },
};

const colorFor = (email) => {
  const p = ["#c4922a", "#6db86d", "#d4ab63", "#9b6b2f", "#c19a6b"];
  let h = 0;
  for (const c of email || "") h = c.charCodeAt(0) + ((h << 5) - h);
  return p[Math.abs(h) % p.length];
};

export default function App() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [modalState, setModalState] = useState({
    isOpen: false,
    domain: null,
    entry: null,
  });
  const [activeTab, setActiveTab] = useState("record");
  const [showProfile, setShowProfile] = useState(false);
  const [mainTab, setMainTab] = useState("home");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  const toggleGroup = (key) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const openSidebarForDomain = (domainKey) => {
    const n = { ...expandedGroups };
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((l) => {
      if (domainData[domainKey]?.[l]) n[`${l}-${domainKey}`] = true;
    });
    setExpandedGroups(n);
    setSidebarOpen(true);
  };

  const openEntry = (domain, entry) => {
    setModalState({ isOpen: true, domain, entry });
    setActiveTab("record");
    setSidebarOpen(false);
    setChatHistory([
      {
        role: "ai",
        text: `Namaskar. I carry the knowledge of ${entry}. Ask me about the techniques, the wisdom, the signs to watch for, or what a learner must know.`,
      },
    ]);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", text: chatInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setTimeout(() => {
      const aiReply = {
        role: "ai",
        text: getChatResponse(modalState.entry, userMsg.text),
      };
      setChatHistory((prev) => [...prev, aiReply]);
    }, 1000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // LOADING
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 50% 0%,#3d1f08,#1c0d04 50%,#0a0401)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "IM Fell DW Pica,serif",
              fontSize: 36,
              color: "rgba(212,171,99,.5)",
              marginBottom: 10,
            }}
          >
            Living{" "}
            <em style={{ color: "rgba(212,171,99,.7)", fontStyle: "normal" }}>
              Memory
            </em>
          </div>
          <div
            style={{
              fontFamily: "Space Mono,monospace",
              fontSize: 10,
              letterSpacing: ".2em",
              color: "rgba(212,171,99,.25)",
              textTransform: "uppercase",
            }}
          >
            Loading...
          </div>
        </div>
      </div>
    );

  // AUTH WALL
  if (!user) return <AuthPage />;

  return (
    <div className="app-root">
      <style>{`
        * { box-sizing: border-box; }
        .nav-tab { transition: color .2s, border-color .2s, text-shadow .2s; }
        .nav-tab:hover { color: rgba(212,171,99,.75) !important; }
        .nav-tab.active {
          color: #d4ab63 !important;
          border-bottom: 2px solid #d4ab63 !important;
          text-shadow: 0 0 16px rgba(212,171,99,.55), 0 0 32px rgba(212,171,99,.25) !important;
        }
        .profile-btn:hover { background: rgba(212,171,99,.18) !important; }
        html, body, #root { height: 100%; width: 100vw; max-width: 100vw; overflow-x: hidden; margin: 0; padding: 0; }
        .app-root { height: 100dvh; width: 100vw; max-width: 100vw; overflow-x: hidden; overflow-y: hidden; display: flex; flex-direction: column; }
        .tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; width: 100%; }
        .archive-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; width: 100%; }
        .community-fill { flex: 1; display: flex; flex-direction: column; padding: 12px 24px 16px; min-height: 0; width: 100%; }
        .announce-bar { padding: 8px 12px; font-size: 11px !important; letter-spacing: 0.06em !important; width: 100%; }
        .announce-bar .full-text { display: inline; }
        .announce-bar .short-text { display: none; }
        .profile-name { display: inline; }
        .sticky-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; perspective: 1000px; width: 100%; }
        .community-tab-wrap { padding: 8px 16px 12px; width: 100%; }
        @media (max-width: 768px) {
          .logo-title-el { font-size: 28px !important; }
          .logo-subtitle-el { display: none !important; }
          .announce-bar .full-text { display: none; }
          .announce-bar .short-text { display: inline; }
          .profile-name { display: none !important; }
          .nav-tab { padding: 12px 14px !important; font-size: 10px !important; letter-spacing: 0.05em !important; }
          .header-top { padding: 8px 12px !important; }
          .sticky-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .parchment-body { padding: 10px 16px 20px !important; }
          .page-center { padding: 0 8px 40px !important; overflow-x: hidden; }
          .parchment-container { width: 100% !important; margin: 20px auto 40px !important; }
          .parchment-body h1 { font-size: 1.8rem !important; }
          .parchment-body p { font-size: 15px !important; }
          .sticky { padding: 16px 12px 20px !important; }
          .community-tab-wrap { padding: 0 !important; }
        }
        @media (max-width: 480px) {
          .logo-title-el { font-size: 22px !important; }
        }
      `}</style>

      {/* Announce Bar */}
      <div
        className="announce-bar"
        style={{
          background: "linear-gradient(90deg,#2c1a0e,#3d2010,#2c1a0e)",
          color: "#e8a020",
          textAlign: "center",
          padding: "10px 20px",
          fontFamily: "Space Mono,monospace",
          fontSize: "13px",
          letterSpacing: "0.14em",
          borderBottom: "1px solid rgba(200,146,42,0.2)",
        }}
      >
        🌿{" "}
        <span className="full-text" style={{ opacity: 0.7 }}>
          LIVING MEMORY PROJECT —
        </span>
        <span className="full-text">
          {" "}
          PRESERVING THE WISDOM OF ODISHA BEFORE IT IS LOST FOREVER
        </span>
        <span className="short-text">LIVING MEMORY PROJECT</span>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-top">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div className="logo-container">
            <a className="logo" href="#">
              <span
                className="logo-title logo-title-el"
                style={{ fontSize: "42px" }}
              >
                Living{" "}
                <em style={{ color: "#d4ab63", fontStyle: "normal" }}>
                  Memory
                </em>
              </span>
              <span
                className="logo-subtitle logo-subtitle-el"
                style={{
                  fontFamily: "Cormorant Garamond,serif",
                  fontSize: "18px",
                  letterSpacing: "0.1em",
                }}
              >
                an AI knowledge preservation system — Odisha, India
              </span>
            </a>
          </div>

          {/* Profile Button */}
          <button
            className="profile-btn"
            onClick={() => setShowProfile(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "rgba(212,171,99,.08)",
              border: "1px solid rgba(212,171,99,.2)",
              padding: "6px 13px 6px 7px",
              borderRadius: 4,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: colorFor(user.email),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "IM Fell DW Pica,serif",
                fontSize: 14,
                color: "#1c0d04",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {(user.name || "?")[0].toUpperCase()}
            </div>
            <span
              className="profile-name"
              style={{
                fontFamily: "Space Mono,monospace",
                fontSize: 10,
                color: "rgba(212,171,99,.72)",
                letterSpacing: ".05em",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </span>
          </button>
        </div>
      </header>

      {/* ── CENTERED GLOWING NAV TABS ── */}
      <div
        style={{
          background:
            "linear-gradient(180deg,rgba(0,0,0,.4) 0%,rgba(0,0,0,.25) 100%)",
          borderBottom: "1px solid rgba(212,171,99,.12)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 20px rgba(0,0,0,.3)",
        }}
      >
        {[
          { id: "home", label: "🏛", text: "Archive" },
          { id: "community", label: "🌿", text: "Community" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${mainTab === tab.id ? "active" : ""}`}
            onClick={() => setMainTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom:
                mainTab === tab.id
                  ? "2px solid #d4ab63"
                  : "2px solid transparent",
              padding: "14px 36px",
              cursor: "pointer",
              fontFamily: "Space Mono,monospace",
              fontSize: 12,
              letterSpacing: ".12em",
              color: mainTab === tab.id ? "#d4ab63" : "rgba(212,171,99,.35)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.label}</span>
            {tab.text}
          </button>
        ))}
      </div>

      {/* ── COMMUNITY TAB ── */}
      {mainTab === "community" && (
        <div className="tab-content community-tab-wrap">
          <CommunityChat domainData={domainData} />
        </div>
      )}

      {/* ── HOME / ARCHIVE TAB ── */}
      {mainTab === "home" && (
        <div className="tab-content">
          <div className="archive-scroll">
            <main className="main-content">
              <div className="page-center fade-in">
                {/* Parchment Hero */}
                <div className="parchment-container">
                  <img
                    src="/Images/paper1.png"
                    alt="top edge"
                    className="parchment-cap-top"
                  />
                  <div className="parchment-body">
                    <div className="hero-eyebrow">
                      SDG 4 · 8 · 10 · 13 · 15 — Living Memory Project
                    </div>
                    <h1>
                      Preserving <em>Odisha's</em> Ancient Wisdom
                    </h1>
                    <p>
                      Every 14 days, a language dies — and with it, millennia of
                      indigenous knowledge. Living Memory uses AI to extract,
                      preserve, and transfer the tacit wisdom of Odisha's elders
                      before it vanishes forever. Each entry is a living
                      archive.
                    </p>
                  </div>
                  <img
                    src="/Images/paper3.png"
                    alt="bottom edge"
                    className="parchment-cap-bottom"
                  />
                </div>

                {/* Sticky Notes */}
                <div className="sticky-grid">
                  <div
                    onClick={() => openSidebarForDomain("agriculture")}
                    style={{ cursor: "pointer" }}
                  >
                    <StickyNote
                      color="green"
                      title="🌾 Agriculture"
                      animated={true}
                    >
                      <p
                        style={{
                          textAlign: "center",
                          fontSize: "16px",
                          color: "#2a1a08",
                          marginBottom: "16px",
                          fontFamily: "Cormorant Garamond,serif",
                        }}
                      >
                        Indigenous cultivation, seed preservation, soil
                        knowledge, and weather reading.
                      </p>
                      <div
                        style={{
                          borderTop: "1px solid rgba(0,0,0,0.1)",
                          paddingTop: "10px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontFamily: "Space Mono",
                        }}
                      >
                        78 entries · A–Z
                      </div>
                    </StickyNote>
                  </div>
                  <div
                    onClick={() => openSidebarForDomain("health")}
                    style={{ cursor: "pointer" }}
                  >
                    <StickyNote color="blue" title="🏥 Health" animated={true}>
                      <p
                        style={{
                          textAlign: "center",
                          fontSize: "16px",
                          color: "#2a1a08",
                          marginBottom: "16px",
                          fontFamily: "Cormorant Garamond,serif",
                        }}
                      >
                        Tribal herbal medicine, forest plant pharmacology, and
                        ancestral healing practices.
                      </p>
                      <div
                        style={{
                          borderTop: "1px solid rgba(0,0,0,0.1)",
                          paddingTop: "10px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontFamily: "Space Mono",
                        }}
                      >
                        64 entries · A–Z
                      </div>
                    </StickyNote>
                  </div>
                  <div
                    onClick={() => openSidebarForDomain("art-craft")}
                    style={{ cursor: "pointer" }}
                  >
                    <StickyNote
                      color="yellow"
                      title="🎨 Art & Craft"
                      animated={true}
                    >
                      <p
                        style={{
                          textAlign: "center",
                          fontSize: "16px",
                          color: "#2a1a08",
                          marginBottom: "16px",
                          fontFamily: "Cormorant Garamond,serif",
                        }}
                      >
                        Pattachitra, Dhokra, Sambalpuri weaving, and hundreds of
                        craft traditions.
                      </p>
                      <div
                        style={{
                          borderTop: "1px solid rgba(0,0,0,0.1)",
                          paddingTop: "10px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontFamily: "Space Mono",
                        }}
                      >
                        60 entries · A–Z
                      </div>
                    </StickyNote>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* OVERLAYS */}
      {(isSidebarOpen || modalState.isOpen) && (
        <div
          onClick={() => {
            setSidebarOpen(false);
            setModalState({ isOpen: false });
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 300,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* A-Z SIDEBAR */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "min(340px, 85vw)",
          height: "100vh",
          background: "#fcf5e6",
          zIndex: 400,
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          borderRight: "2px solid rgba(212,171,99,0.5)",
          boxShadow: "6px 0 40px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            width: "32px",
            flexShrink: 0,
            background:
              "linear-gradient(180deg,#1a3d1a 0%,#2d5a27 50%,#1a3d1a 100%)",
            position: "relative",
            boxShadow:
              "inset -3px 0 10px rgba(0,0,0,0.4),2px 0 6px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 0,
              width: "24px",
              height: "100%",
              backgroundImage:
                "repeating-linear-gradient(180deg,transparent 0px,transparent 18px,rgba(255,255,255,0.06) 18px,rgba(255,255,255,0.06) 20px)",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "16px",
              background: "rgba(252,250,246,0.98)",
              borderBottom: "2px solid rgba(200,146,42,0.2)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontFamily: "IM Fell DW Pica,serif",
                fontSize: "18px",
                color: "#7b4c1a",
              }}
            >
              Knowledge Index
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#c4922a",
                fontFamily: "IM Fell DW Pica,serif",
              }}
            >
              ✕ Close
            </button>
          </div>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
            const hasData = Object.keys(DOMAIN_CONFIG).some(
              (dKey) => domainData[dKey]?.[letter]?.length > 0,
            );
            if (!hasData) return null;
            return (
              <div
                key={letter}
                style={{ borderBottom: "1px solid rgba(139,69,19,0.1)" }}
              >
                <div
                  style={{
                    padding: "10px 16px 2px",
                    fontFamily: "IM Fell DW Pica,serif",
                    fontSize: "26px",
                    color: "#c4922a",
                  }}
                >
                  {letter}
                </div>
                {Object.entries(DOMAIN_CONFIG).map(([dKey, dConfig]) => {
                  const items = domainData[dKey]?.[letter];
                  if (!items?.length) return null;
                  const groupKey = `${letter}-${dKey}`;
                  const isOpen = !!expandedGroups[groupKey];
                  return (
                    <div
                      key={dKey}
                      style={{ borderTop: "1px solid rgba(200,146,42,0.1)" }}
                    >
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          background: isOpen
                            ? "rgba(212,171,99,0.1)"
                            : "transparent",
                          border: "none",
                          padding: "10px 16px 10px 20px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.2s",
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{dConfig.icon}</span>
                        <span
                          style={{
                            fontFamily: "Space Mono",
                            fontSize: "11px",
                            letterSpacing: "0.08em",
                            fontWeight: "bold",
                            flex: 1,
                            color: dConfig.color,
                          }}
                        >
                          {dConfig.label.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "rgba(92,51,23,0.6)",
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "0.2s",
                          }}
                        >
                          ▶
                        </span>
                      </button>
                      {isOpen && (
                        <ul
                          style={{
                            listStyle: "none",
                            margin: 0,
                            padding: "4px 0",
                            background: "rgba(200,146,42,0.03)",
                          }}
                        >
                          {items.map((item, idx) => {
                            const title = item.title;
                            const hasSample = sampleKnowledge[dKey]?.[title];
                            return (
                              <li key={idx}>
                                <button
                                  onClick={() => openEntry(dKey, title)}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#5a4a3a",
                                    padding: "6px 16px 6px 42px",
                                    fontSize: "15px",
                                    fontFamily: "Cormorant Garamond,serif",
                                    transition: "color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.target.style.color = "#c4922a")
                                  }
                                  onMouseOut={(e) =>
                                    (e.target.style.color = "#5a4a3a")
                                  }
                                >
                                  {title}{" "}
                                  {hasSample && (
                                    <span
                                      style={{
                                        color: "#6db86d",
                                        fontSize: "8px",
                                        marginLeft: "6px",
                                      }}
                                    >
                                      ●
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ENTRY MODAL */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          display: modalState.isOpen ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          padding: "max(12px, 2vw)",
        }}
      >
        {modalState.isOpen && (
          <PaperCard
            style={{
              width: "100%",
              maxWidth: "min(850px, 95vw)",
              maxHeight: "min(90vh, 90vh)",
              overflowY: "auto",
              padding: "0",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                padding: "max(16px, 2vw)",
                borderBottom: "1px solid rgba(212,171,99,0.3)",
                background: "linear-gradient(to bottom,#f5f0e1,#ede0be)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "Space Mono",
                  color: DOMAIN_CONFIG[modalState.domain].color,
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                {DOMAIN_CONFIG[modalState.domain].icon}{" "}
                {DOMAIN_CONFIG[modalState.domain].label.toUpperCase()}
              </div>
              <h2
                style={{
                  fontFamily: "IM Fell DW Pica,serif",
                  fontSize: "clamp(20px, 6vw, 32px)",
                  color: "#2a1a08",
                  margin: 0,
                }}
              >
                {modalState.entry}
              </h2>
              <button
                onClick={() => setModalState({ isOpen: false })}
                style={{
                  position: "absolute",
                  top: "max(12px, 1.5vw)",
                  right: "max(12px, 1.5vw)",
                  background: "rgba(212,171,99,0.1)",
                  border: "1px solid rgba(212,171,99,0.5)",
                  padding: "6px 12px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  fontFamily: "Space Mono",
                  fontSize: "12px",
                }}
              >
                ✕ Close
              </button>
            </div>
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(212,171,99,0.3)",
                background: "rgba(212,171,99,0.08)",
                padding: "0 max(16px, 2vw)",
                flexWrap: "wrap",
              }}
            >
              {[
                { id: "record", label: "🎙 Record" },
                { id: "knowledge", label: "📄 Knowledge" },
                { id: "analysis", label: "🔬 Analysis" },
                { id: "graph", label: "🕸 Graph" },
                { id: "chat", label: "💬 Mentor" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "12px max(10px, 1vw)",
                    cursor: "pointer",
                    fontFamily: "Space Mono",
                    fontSize: "clamp(11px, 2vw, 12px)",
                    letterSpacing: "0.05em",
                    color: activeTab === tab.id ? "#c4922a" : "#7b6b5a",
                    borderBottom:
                      activeTab === tab.id
                        ? "3px solid #c4922a"
                        : "3px solid transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ padding: "max(16px, 2vw)" }}>
              {activeTab === "record" && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      border: "2px dashed rgba(212,171,99,0.4)",
                      padding: "48px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: "rgba(212,171,99,0.05)",
                      marginBottom: "24px",
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      🎙
                    </div>
                    <h3
                      style={{
                        fontFamily: "IM Fell DW Pica,serif",
                        fontSize: "24px",
                        marginBottom: "8px",
                      }}
                    >
                      Upload Interview
                    </h3>
                    <p
                      style={{
                        color: "#7b6b5a",
                        fontSize: "16px",
                        fontFamily: "Cormorant Garamond,serif",
                        marginBottom: "24px",
                      }}
                    >
                      Video or audio recording of the knowledge holder
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ fontFamily: "IM Fell DW Pica,serif" }}
                    >
                      Choose File
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: "IM Fell DW Pica,serif",
                      color: "#7b6b5a",
                      margin: "24px 0",
                    }}
                  >
                    — OR —
                  </div>
                  <button
                    className="mic"
                    style={{
                      width: "100%",
                      maxWidth: "300px",
                      margin: "0 auto",
                      display: "block",
                      fontFamily: "IM Fell DW Pica,serif",
                    }}
                  >
                    Record Live Interview
                  </button>
                </div>
              )}
              {activeTab === "knowledge" && (
                <div>
                  {sampleKnowledge[modalState.domain]?.[modalState.entry] ? (
                    sampleKnowledge[modalState.domain][
                      modalState.entry
                    ].blocks.map((b, i) => (
                      <div
                        key={i}
                        style={{
                          background: "rgba(212,171,99,0.08)",
                          borderLeft: `4px solid ${DOMAIN_CONFIG[modalState.domain].color}`,
                          padding: "16px 24px",
                          marginBottom: "16px",
                          borderRadius: "0 8px 8px 0",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "Space Mono",
                            fontSize: "11px",
                            color: "#7b6b5a",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: "8px",
                          }}
                        >
                          {b.label}
                        </div>
                        <div
                          style={{
                            fontSize: "18px",
                            fontFamily: "Cormorant Garamond,serif",
                            color: "#2a1a08",
                            lineHeight: "1.6",
                          }}
                        >
                          {b.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px",
                        color: "#7b6b5a",
                        fontStyle: "italic",
                        fontFamily: "Cormorant Garamond,serif",
                        fontSize: "18px",
                      }}
                    >
                      No interview has been recorded for this entry yet.
                    </div>
                  )}
                </div>
              )}
              {activeTab === "analysis" && (
                <div>
                  {sampleAnalysis[modalState.domain]?.[modalState.entry] ? (
                    sampleAnalysis[modalState.domain][modalState.entry].map(
                      (p, i) => (
                        <div
                          key={i}
                          style={{
                            background: "rgba(255,255,255,0.5)",
                            border: "1px solid rgba(212,171,99,0.3)",
                            borderLeft: `4px solid ${DOMAIN_CONFIG[modalState.domain].color}`,
                            padding: "16px",
                            marginBottom: "16px",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "Space Mono",
                              fontSize: "11px",
                              color: DOMAIN_CONFIG[modalState.domain].color,
                              marginBottom: "8px",
                            }}
                          >
                            {p.time} · {p.title}
                          </div>
                          <div
                            style={{
                              fontSize: "17px",
                              fontFamily: "Cormorant Garamond,serif",
                              color: "#353535",
                              marginBottom: "8px",
                            }}
                          >
                            {p.desc}
                          </div>
                          <div
                            style={{
                              fontFamily: "Space Mono",
                              fontSize: "11px",
                              color: "#d05e52",
                            }}
                          >
                            {p.critical}
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px",
                        color: "#7b6b5a",
                        fontStyle: "italic",
                        fontFamily: "Cormorant Garamond,serif",
                        fontSize: "18px",
                      }}
                    >
                      Upload a technique video to generate AI movement analysis.
                    </div>
                  )}
                </div>
              )}
              {activeTab === "graph" && (
                <div
                  style={{
                    height: "400px",
                    background: "rgba(212,171,99,0.05)",
                    border: "1px solid rgba(212,171,99,0.2)",
                    borderRadius: "8px",
                    position: "relative",
                  }}
                >
                  {sampleKnowledge[modalState.domain]?.[modalState.entry]
                    ?.graph ? (
                    <svg width="100%" height="100%">
                      <g transform="translate(400,200)">
                        {sampleKnowledge[modalState.domain][
                          modalState.entry
                        ].graph.nodes.map((node, i, arr) => {
                          const angle =
                            (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                          const nx = 150 * Math.cos(angle),
                            ny = 150 * Math.sin(angle);
                          return (
                            <g key={i}>
                              <line
                                x1="0"
                                y1="0"
                                x2={nx}
                                y2={ny}
                                stroke="rgba(212,171,99,0.4)"
                                strokeWidth="1"
                              />
                              <circle
                                cx={nx}
                                cy={ny}
                                r="8"
                                fill={`${DOMAIN_CONFIG[modalState.domain].color}55`}
                                stroke={DOMAIN_CONFIG[modalState.domain].color}
                                strokeWidth="2"
                              />
                              <text
                                x={nx + (nx > 0 ? 15 : -15)}
                                y={ny + 4}
                                textAnchor={nx > 0 ? "start" : "end"}
                                fontSize="14"
                                fill="#5a4a3a"
                                fontFamily="Cormorant Garamond,serif"
                              >
                                {node}
                              </text>
                            </g>
                          );
                        })}
                        <circle
                          cx="0"
                          cy="0"
                          r="30"
                          fill="rgba(212,171,99,0.2)"
                          stroke={DOMAIN_CONFIG[modalState.domain].color}
                          strokeWidth="2"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fontSize="16"
                          fill="#2a1a08"
                          fontFamily="IM Fell DW Pica,serif"
                        >
                          {
                            sampleKnowledge[modalState.domain][
                              modalState.entry
                            ].graph.center.split(" ")[0]
                          }
                        </text>
                      </g>
                    </svg>
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                        color: "#7b6b5a",
                        fontStyle: "italic",
                        fontFamily: "Cormorant Garamond,serif",
                        fontSize: "18px",
                      }}
                    >
                      Upload an interview to generate graph
                    </div>
                  )}
                </div>
              )}
              {activeTab === "chat" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "min(400px, 50vh)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "12px",
                      background: "rgba(255,255,255,0.4)",
                      borderRadius: "8px",
                      border: "1px solid rgba(212,171,99,0.2)",
                    }}
                  >
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginBottom: "12px",
                          flexDirection:
                            msg.role === "user" ? "row-reverse" : "row",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background:
                              msg.role === "user"
                                ? "rgba(109,184,109,0.2)"
                                : "rgba(212,171,99,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            flexShrink: 0,
                          }}
                        >
                          {msg.role === "user"
                            ? "🙋"
                            : DOMAIN_CONFIG[modalState.domain].icon}
                        </div>
                        <div
                          style={{
                            background:
                              msg.role === "user" ? "#e9f5e9" : "#fcf5e6",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            maxWidth: "75%",
                            fontSize: "clamp(13px, 2vw, 17px)",
                            fontFamily: "Cormorant Garamond,serif",
                            color: "#353535",
                            lineHeight: "1.5",
                            border: `1px solid ${msg.role === "user" ? "rgba(109,184,109,0.3)" : "rgba(212,171,99,0.3)"}`,
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder="Ask the mentor..."
                      style={{
                        flex: 1,
                        minWidth: "150px",
                        padding: "10px 12px",
                        borderRadius: "4px",
                        border: "1px solid rgba(212,171,99,0.4)",
                        fontFamily: "Cormorant Garamond",
                        fontSize: "14px",
                        background: "rgba(255,255,255,0.8)",
                      }}
                    />
                    <button
                      onClick={handleSendChat}
                      className="btn btn-primary"
                      style={{
                        padding: "10px 16px",
                        fontFamily: "IM Fell DW Pica,serif",
                        fontSize: "13px",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </PaperCard>
        )}
      </div>
    </div>
  );
}