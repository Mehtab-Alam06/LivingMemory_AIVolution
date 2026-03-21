import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import domainData from "./data/domainData.json";
import {
  sampleKnowledge,
  sampleAnalysis
} from "./data/knowledgedata.js";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { API } from "./context/AuthContext"; // Assuming API url is here or just hardcode if missing
// Because we already import { useAuth }, we can just import { API } from ./context/AuthContext if it has it. Or we just define API using import.meta.env.
import PaperCard from "./components/PaperCard";
import StickyNote from "./components/StickyNote";
import AIInterview from "./components/Interview";
import KnowledgeSection from "./components/KnowledgeSection";
import AuthPage from "./components/Auth/AuthPage";
import ProfileModal from "./components/Auth/ProfileModal";
import CommunityChat from "./components/Community/CommunityChat";
import ContributeKnowledge from "./components/ContributeKnowledge/ContributeKnowledge";
import LandingPage from "./components/LandingPage/LandingPage";
import AdminDashboard from "./components/Admin/AdminDashboard";
import TechniqueAnalysis from "./components/TechniqueAnalysis";
import KnowledgeGraph from "./components/KnowledgeGraph";
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
  const { user, loading, logout } = useAuth();
  console.log("APP RENDER: Current User:", user);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [modalState, setModalState] = useState({
    isOpen: false,
    domain: null,
    entry: null,
  });
  const [resumeData, setResumeData] = useState(null);
  const [activeTab, setActiveTab] = useState("record");
  const [showProfile, setShowProfile] = useState(false);
  const [mainTab, setMainTab] = useState("home");
  const [showAuth, setShowAuth] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [allChats, setAllChats] = useState({}); // Persist chat histories per topic
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
    // As requested: start fresh, keep old chat hidden until requested
    const initial = [{ role: "ai", text: `Namaskar. I carry the knowledge of ${entry}. Ask me about the techniques, the wisdom, the signs to watch for, or what a learner must know.` }];
    setChatHistory(initial);
  };

  const handleSendChat = async (overrideTopic = null, originalText = null) => {
    const textToSend = originalText || chatInput.trim();
    if (!textToSend) return;
    
    if (!overrideTopic) {
        setChatHistory((prev) => [...prev, { role: "user", text: textToSend }]);
        setChatInput("");
    } else {
        setChatHistory(prev => {
            const copy = [...prev];
            if (copy[copy.length - 1]?.type === "mismatch_warning") copy.pop();
            return copy;
        });
    }
    
    setChatHistory((prev) => [...prev, { role: "ai", text: "..." }]);

    try {
      const response = await fetch(`${API}/mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory,
          topic: modalState.entry,
          domain: modalState.domain,
          overrideTopic
        })
      });
      const data = await response.json();
      
      if (data.topic_mismatch) {
        setChatHistory((prev) => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { 
            role: "ai", 
            type: "mismatch_warning",
            detected_topic: data.detected_topic,
            original_msg: textToSend,
            text: `Hold on—your question appears to be about **${data.detected_topic}**, but we are currently exploring **${modalState.entry}**.\n\nShall I override the current topic and specifically search the global archives for **${data.detected_topic}** instead?`
          };
          return newHistory;
        });
        return;
      }

      setChatHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { 
            role: "ai", 
            text: data.reply || "Sorry, I couldn't reach the archives.",
            sources: data.sources 
        };
        return newHistory;
      });
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: "ai", text: "Error connecting to the mentor." };
        return newHistory;
      });
    }
  };

  useEffect(() => {
    // Only save to global history if this is a real conversation (more than just the initial greeting)
    if (modalState.entry && chatHistory.length > 1) {
        setAllChats(prev => ({ ...prev, [modalState.entry]: chatHistory }));
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, modalState.entry]);

  // ── LOADING ──────────────────────────────────────────────────────────────────
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

  // ── AUTH WALL ────────────────────────────────────────────────────────────────
  if (!user && !showAuth)
    return <LandingPage onEnter={() => setShowAuth(true)} />;
  if (!user) return <AuthPage />;

  return (
    <div className="app-root">
      <style>{`
        .nav-tab { transition: color .2s, border-color .2s, text-shadow .2s; }
        .nav-tab:hover { color: rgba(212,171,99,.75) !important; }
        .nav-tab.active {
          color: #d4ab63 !important;
          border-bottom: 2px solid #d4ab63 !important;
          text-shadow: 0 0 16px rgba(212,171,99,.55), 0 0 32px rgba(212,171,99,.25) !important;
        }
        .profile-btn:hover { background: rgba(212,171,99,.18) !important; }
        
        /* Markdown Chat Rendering Overrides */
        .mentor-markdown p { margin: 0 0 10px 0; font-size: 15.5px !important; line-height: 1.6 !important; }
        .mentor-markdown ul, .mentor-markdown ol { margin: 4px 0 10px 0; padding-left: 20px; font-size: 15.5px !important; line-height: 1.6 !important; }
        .mentor-markdown li { margin-bottom: 4px; font-size: 15.5px !important; line-height: 1.6 !important; }
        .mentor-markdown a { color: #9b6b2f; text-decoration: underline; font-weight: bold; }
        .mentor-markdown a:hover { color: #d4ab63; }
        .mentor-markdown h1, .mentor-markdown h2, .mentor-markdown h3, .mentor-markdown h4 { margin: 12px 0 8px 0; font-family: 'IM Fell DW Pica', serif; color: #2a1a08; }
        
        html, body, #root { height: 100%; overflow: hidden; }
        .app-root { height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
        .archive-scroll { flex: 1; overflow-y: auto; }
        .community-fill { flex: 1; display: flex; flex-direction: column; padding: 12px 24px 16px; min-height: 0; }
        .contribute-fill { flex: 1; overflow-y: auto; }
        .announce-bar { padding: 8px 12px; font-size: 11px !important; letter-spacing: 0.06em !important; }
        .announce-bar .full-text { display: inline; }
        .announce-bar .short-text { display: none; }
        .profile-name { display: inline; }
        .sticky-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; perspective: 1000px; }
        .modal-tab-content { padding: max(16px,2vw); }
        @media (max-width: 768px) {
          .logo-title-el { font-size: 28px !important; }
          .logo-subtitle-el { display: none !important; }
          .announce-bar .full-text { display: none; }
          .announce-bar .short-text { display: inline; }
          .profile-name { display: none !important; }
          .nav-tab { padding: 12px 20px !important; font-size: 11px !important; }
          .header-top { padding: 8px 12px !important; }
          .sticky-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .parchment-body { padding: 10px 24px 20px !important; }
          .page-center { padding: 0 12px 40px !important; }
          .parchment-body h1 { font-size: 2rem !important; }
          .parchment-body p { font-size: 16px !important; }
          .sticky { padding: 20px 16px 24px !important; }
          .community-tab-wrap { padding: 4px 8px 8px !important; }
          .modal-tab-content { padding: 12px !important; }
        }
        @media (max-width: 480px) {
          .logo-title-el { font-size: 22px !important; }
          .nav-tab { padding: 10px 14px !important; font-size: 10px !important; letter-spacing: 0.06em !important; }
          .community-tab-wrap { padding: 2px 4px 6px !important; }
        }
      `}</style>

      {/* ── Announce Bar ── */}
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
          LIVING MEMORY PROJECT —{" "}
        </span>
        <span className="full-text">
          PRESERVING THE WISDOM OF ODISHA BEFORE IT IS LOST FOREVER
        </span>
        <span className="short-text">LIVING MEMORY PROJECT</span>
      </div>

      {/* ── Header ── */}
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

      {/* ── Main Nav Tabs ── */}
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
          { id: "contribute", label: "📜", text: "Contribute" },
          ...(user?.role === 'admin' ? [{ id: "admin", label: "⚙️", text: "Admin" }] : [])
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

      {/* ── Community Tab ── */}
      {mainTab === "community" && (
        <div
          className="tab-content community-tab-wrap"
          style={{ padding: "8px 16px 12px", boxSizing: "border-box" }}
        >
          <CommunityChat domainData={domainData} />
        </div>
      )}

      {/* ── CONTRIBUTE TAB ── */}
      {mainTab === "contribute" && (
        <div className="tab-content contribute-fill">
          <ContributeKnowledge onBack={() => setMainTab("home")} />
        </div>
      )}

      {/* ── ADMIN TAB ── */}
      {mainTab === "admin" && user?.role === "admin" && (
        <div className="tab-content" style={{ background: "linear-gradient(135deg, #fdf8ec, #f5edd6)" }}>
          <AdminDashboard domainData={domainData} onBack={() => setMainTab("home")} />
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
                  {[
                    {
                      domain: "agriculture",
                      color: "green",
                      title: "🌾 Agriculture",
                      desc: "Indigenous cultivation, seed preservation, soil knowledge, and weather reading.",
                      count: "78 entries · A–Z",
                    },
                    {
                      domain: "health",
                      color: "blue",
                      title: "🏥 Health",
                      desc: "Tribal herbal medicine, forest plant pharmacology, and ancestral healing practices.",
                      count: "64 entries · A–Z",
                    },
                    {
                      domain: "art-craft",
                      color: "yellow",
                      title: "🎨 Art & Craft",
                      desc: "Pattachitra, Dhokra, Sambalpuri weaving, and hundreds of craft traditions.",
                      count: "60 entries · A–Z",
                    },
                  ].map(({ domain, color, title, desc, count }) => (
                    <div
                      key={domain}
                      onClick={() => openSidebarForDomain(domain)}
                      style={{ cursor: "pointer" }}
                    >
                      <StickyNote color={color} title={title} animated={true}>
                        <p
                          style={{
                            textAlign: "center",
                            fontSize: "16px",
                            color: "#2a1a08",
                            marginBottom: "16px",
                            fontFamily: "Cormorant Garamond,serif",
                          }}
                        >
                          {desc}
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
                          {count}
                        </div>
                      </StickyNote>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* ── Profile Modal ── */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* ── Overlay ── */}
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

      {/* ── A-Z Sidebar ── */}
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
                                  {title}
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

      {/* ── Entry Modal ── */}
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
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: "0",
              borderRadius: "4px",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "max(16px, 2vw)",
                borderBottom: "1px solid rgba(212,171,99,0.3)",
                background: "linear-gradient(to bottom,#f5f0e1,#ede0be)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "Space Mono",
                      color: DOMAIN_CONFIG[modalState.domain]?.color || "#d4ab63",
                      letterSpacing: "0.15em",
                      marginBottom: "6px",
                      fontWeight: "bold",
                    }}
                  >
                    {DOMAIN_CONFIG[modalState.domain]?.icon?.toUpperCase() || "📜"} {" "}
                    {DOMAIN_CONFIG[modalState.domain]?.label?.toUpperCase() || "KNOWLEDGE"}
                  </div>
                  <h2
                    style={{
                      fontFamily: "IM Fell DW Pica,serif",
                      fontSize: "clamp(22px, 5vw, 32px)",
                      color: "#2a1a08",
                      margin: 0,
                      lineHeight: 1.1
                    }}
                  >
                    {modalState.entry}
                  </h2>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button
                    onClick={() => setModalState({ isOpen: false })}
                    style={{
                      background: "rgba(212,171,99,0.15)",
                      border: "1px solid rgba(212,171,99,0.4)",
                      padding: "8px 16px",
                      cursor: "pointer",
                      borderRadius: "6px",
                      fontFamily: "Space Mono",
                      fontSize: "12px",
                      color: '#4a301a',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(212,171,99,0.25)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(212,171,99,0.15)'}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: "flex",
                gap: '4px',
                padding: "0 20px",
                flexWrap: "nowrap",
                overflowX: 'auto',
                flexShrink: 0,
                marginTop: '-10px',
                zIndex: 2,
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
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
                    background: activeTab === tab.id 
                      ? "linear-gradient(to bottom, #f5edd8, #ede0be)" 
                      : "linear-gradient(to bottom, #ede0be, #e4d4a8)",
                    border: "1px solid rgba(155, 107, 47, 0.3)",
                    borderBottom: activeTab === tab.id ? "none" : "1px solid rgba(155, 107, 47, 0.3)",
                    padding: "12px 24px",
                    cursor: "pointer",
                    fontFamily: "Cormorant Garamond, serif",
                    fontWeight: 'bold',
                    fontSize: "16px",
                    letterSpacing: "0.02em",
                    color: activeTab === tab.id ? "#8c6414" : "#7b6b5a",
                    position: 'relative',
                    top: activeTab === tab.id ? '1px' : '0',
                    zIndex: activeTab === tab.id ? 10 : 1,
                    borderRadius: '8px 8px 0 0',
                    boxShadow: activeTab === tab.id 
                      ? "0 -4px 10px rgba(0,0,0,0.05)" 
                      : "inset 0 -2px 5px rgba(0,0,0,0.05)",
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 'fit-content'
                  }}
                >
                  <span style={{ fontSize: "16px", opacity: activeTab === tab.id ? 1 : 0.6 }}>
                    {tab.label.split(' ')[0]}
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>
                    {tab.label.split(' ')[1]}
                  </span>
                  {activeTab === tab.id && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-1px', 
                      left: 0, 
                      right: 0, 
                      height: '2px', 
                      background: '#f5edd8', 
                      zIndex: 11 
                    }} />
                  )}
                </button>
              ))}
            </div>

            {/* ── Record Tab — stays mounted, hidden via CSS when inactive ── */}
            <div
              style={{ display: activeTab === "record" ? "flex" : "none", flex: 1, minHeight: 0, overflowY: "auto", padding: "20px" }}
              className="modal-tab-content-wrapper"
            >
              <div className="parchment-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <div className="parchment-body" style={{ padding: '30px 40px' }}>
                  <AIInterview
                    topic={modalState.entry}
                    domain={modalState.domain}
                    userName={user?.name}
                    onSave={(data) => console.log("Interview saved:", data)}
                    resumeData={resumeData}
                    clearResumeData={() => setResumeData(null)}
                  />
                </div>
              </div>
            </div>

            {/* ── Knowledge Tab — interview history & archive ── */}
            <div style={{ display: activeTab === "knowledge" ? "flex" : "none", flex: 1, flexDirection: "column", minHeight: 0, overflowY: "auto", padding: "20px" }} className="modal-tab-content-wrapper">
              <div className="parchment-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <div className="parchment-body" style={{ padding: '30px 40px' }}>
                  <KnowledgeSection
                    topic={modalState.entry}
                    domain={modalState.domain}
                    onResumeRequest={(iv) => {
                      setResumeData(iv);
                      setActiveTab("record");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── Analysis Tab ── */}
            <div style={{ display: activeTab === "analysis" ? "block" : "none", flex: 1, minHeight: 0, overflowY: "auto", padding: "0" }} className="modal-tab-content-wrapper">
              <TechniqueAnalysis title={modalState.entry} domain={modalState.domain} />
            </div>

            {/* ── Graph Tab ── */}
            <div style={{ display: activeTab === "graph" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "hidden", flexDirection: "column", padding: "max(16px, 2vw)" }} className="modal-tab-content-wrapper">
              <KnowledgeGraph title={modalState.entry} />
            </div>

            {/* ── Mentor / Chat Tab ── */}
            <div style={{ display: activeTab === "chat" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "hidden", flexDirection: "column", padding: "max(16px, 2vw)" }} className="modal-tab-content-wrapper">
              <div className="parchment-container" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="parchment-body" style={{ padding: '30px 40px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid rgba(140, 100, 20, 0.2)', paddingBottom: '10px' }}>
                    <h2 style={{ margin: 0, fontFamily: 'IM Fell DW Pica, serif', color: '#2a1a08' }}>
                      <span style={{ fontSize: '24px' }}>📜</span> Library of Wisdom
                    </h2>
                    <span style={{ fontFamily: 'Space Mono', fontSize: '11px', color: '#9b6b2f', textTransform: 'uppercase' }}>AI Archival Mentor</span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "16px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      border: "1px dashed rgba(212,171,99,0.3)",
                    }}
                  >
                    {allChats[modalState.entry] && allChats[modalState.entry].length > 1 && chatHistory.length === 1 && (
                      <div style={{ textAlign: "center", paddingBottom: "16px" }}>
                        <button
                          onClick={() => setChatHistory(allChats[modalState.entry])}
                          style={{
                            background: "rgba(212,171,99,0.1)",
                            border: "1px dashed rgba(212,171,99,0.5)",
                            padding: "6px 16px",
                            borderRadius: "20px",
                            cursor: "pointer",
                            fontFamily: "Space Mono",
                            fontSize: "11px",
                            color: "#9b6b2f",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={e => e.target.style.background = "rgba(212,171,99,0.2)"}
                          onMouseOut={e => e.target.style.background = "rgba(212,171,99,0.1)"}
                        >
                          🕒 View Previous Chat History
                        </button>
                      </div>
                    )}
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
                            : DOMAIN_CONFIG[modalState.domain]?.icon || "📜"}
                        </div>
                        <div
                          style={{
                            background:
                              msg.role === "user" ? "#eef7ee" : 'rgba(255, 255, 255, 0.4) url("/Images/paper2.png") center/cover',
                            backgroundBlendMode: "overlay",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            maxWidth: "75%",
                            fontSize: "15.5px",
                            fontFamily: "Cormorant Garamond,serif",
                            color: "#111",
                            lineHeight: "1.5",
                            border: `1px solid ${msg.role === "user" ? "rgba(109,184,109,0.4)" : "rgba(212,171,99,0.4)"}`,
                          }}
                        >
                          {msg.role === "user" ? msg.text : 
                            msg.type === "mismatch_warning" ? (
                              <div className="mentor-markdown">
                                <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{msg.text}</ReactMarkdown>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                                  <button onClick={() => handleSendChat(msg.detected_topic, msg.original_msg)} style={{ background: '#d4ab63', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Cormorant Garamond,serif', fontSize: '15px', fontWeight: 'bold' }}>Yes, search the new topic</button>
                                  <button onClick={() => setChatHistory(prev => prev.slice(0, -1))} style={{ background: 'transparent', color: '#9b6b2f', border: '1px solid rgba(155, 107, 47, 0.5)', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Cormorant Garamond,serif', fontSize: '15px' }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="mentor-markdown">
                                <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{msg.text}</ReactMarkdown>
                                {msg.sources && (msg.sources.web?.length > 0 || msg.sources.yt?.length > 0) && (
                                  <div style={{ marginTop: '16px', borderTop: '1px dashed rgba(212,171,99,0.3)', paddingTop: '12px' }}>
                                    <div style={{ fontSize: '11px', fontFamily: 'Space Mono', color: '#9b6b2f', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.05em' }}>📜 VERIFIED SOURCES</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {msg.sources.web?.map((w, idx) => (
                                        <a key={`web-${idx}`} href={w.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,171,99,0.25)', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s', color: '#4a301a' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.9)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.6)'}>
                                          <div style={{ fontSize: '18px' }}>🌐</div>
                                          <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
                                            <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#9b6b2f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{w.url}</div>
                                          </div>
                                        </a>
                                      ))}
                                      {msg.sources.yt?.map((v, idx) => (
                                        <a key={`yt-${idx}`} href={v.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,171,99,0.25)', borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s', color: '#4a301a' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.9)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.6)'}>
                                          <div style={{ fontSize: '18px' }}>▶️</div>
                                          <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                                            <div style={{ fontFamily: 'Space Mono', fontSize: '10px', color: '#cc2929', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>YouTube • {v.duration?.timestamp || 'Video'}</div>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }
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
                      onClick={() => handleSendChat()}
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
              </div>
            </div>
          </PaperCard>
        )}
      </div>
    </div>
  );
}
