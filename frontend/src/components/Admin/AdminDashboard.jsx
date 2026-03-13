import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard({ domainData }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [data, setData] = useState({ users: [], chat: [], contributions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api/admin` 
  : 'https://livingmemory-aivolution.onrender.com/api/admin';

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/${tab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(prev => ({ ...prev, [tab]: res.data }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
    }
    setLoading(false);
  };

  const deleteItem = async (tab, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await axios.delete(`${API}/${tab}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(prev => ({
        ...prev,
        [tab]: prev[tab].filter(item => item._id !== id)
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete item");
    }
  };

  const updateContributionStatus = async (id, status) => {
    try {
      const res = await axios.patch(`${API}/contributions/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(prev => ({
        ...prev,
        contributions: prev.contributions.map(c => c._id === id ? res.data : c)
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  // ── Render Helpers ──
  const S = {
    btnRow: { display: "flex", gap: "10px", marginTop: "10px" },
    btn: (bg, col) => ({ padding: "6px 12px", borderRadius: "4px", border: "none", cursor: "pointer", background: bg, color: col, fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.05em" }),
    card: { background: "rgba(255,255,255,0.6)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }
  };

  return (
    <div style={{ padding: "max(20px, 3vw)", fontFamily: "'Cormorant Garamond', serif", color: "#2a1a08", overflowY: "auto", height: "100%" }}>
      <h2 style={{ fontFamily: "'IM Fell DW Pica', serif", fontSize: "32px", marginBottom: "20px", borderBottom: "1px solid rgba(212,171,99,0.3)", paddingBottom: "10px" }}>
        Admin Dashboard
      </h2>

      {/* TABS */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", borderBottom: "2px solid rgba(212,171,99,0.1)" }}>
        {["users", "chat", "contributions"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              fontSize: "12px",
              letterSpacing: "0.1em",
              borderBottom: activeTab === tab ? "2px solid #d4ab63" : "2px solid transparent",
              color: activeTab === tab ? "#d4ab63" : "rgba(212,171,99,0.5)"
            }}
          >
            Manage {tab}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontFamily: "Space Mono" }}>Loading...</p>}
      {error && <div style={{ color: "#d05e52", padding: "12px", background: "rgba(208,94,82,0.1)", borderRadius: "6px", marginBottom: "16px" }}>⚠️ {error}</div>}

      {/* USERS TAB */}
      {!loading && activeTab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {data.users.map(u => (
            <div key={u._id} style={S.card}>
              <div style={{ fontWeight: "bold", fontSize: "18px" }}>{u.name || "Anonymous"} <span style={{fontSize: "12px", color: u.role === 'admin' ? "#c4922a" : "#7b6b5a"}}>({u.role})</span></div>
              <div style={{ fontFamily: "Space Mono", fontSize: "11px", color: "rgba(90,74,58,0.7)", margin: "4px 0" }}>{u.email}</div>
              <div style={S.btnRow}>
                {u.role !== 'admin' && (
                  <button onClick={() => deleteItem("users", u._id)} style={S.btn("rgba(208,94,82,0.1)", "#d05e52")}>
                    Delete User
                  </button>
                )}
              </div>
            </div>
          ))}
          {data.users.length === 0 && <p>No users found.</p>}
        </div>
      )}

      {/* CHAT TAB */}
      {!loading && activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.chat.map(msg => (
            <div key={msg._id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px" }}>
              <div>
                <div style={{ fontFamily: "Space Mono", fontSize: "10px", color: "#c4922a", marginBottom: "6px" }}>
                  {msg.user?.name || "Unknown"} ({msg.user?.email || "No Email"}) • {new Date(msg.timestamp).toLocaleString()}
                </div>
                <div style={{ fontSize: "16px" }}>{msg.text}</div>
              </div>
              <button onClick={() => deleteItem("chat", msg._id)} style={S.btn("rgba(208,94,82,0.1)", "#d05e52")}>Delete</button>
            </div>
          ))}
          {data.chat.length === 0 && <p>No chat messages found.</p>}
        </div>
      )}

      {/* CONTRIBUTIONS TAB */}
      {!loading && activeTab === "contributions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.contributions.map(c => (
            <div key={c._id} style={{ ...S.card, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px", fontWeight: "bold" }}>{c.knowledgeTitle} <span style={{fontSize:"14px", fontWeight:"normal", fontStyle:"italic"}}>by {c.name || c.userId?.name}</span></span>
                <span style={{ fontFamily: "Space Mono", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", background: c.submissionStatus === "Pending" ? "rgba(212,171,99,0.2)" : c.submissionStatus === "Approved" ? "rgba(109,184,109,0.2)" : "rgba(208,94,82,0.2)", color: c.submissionStatus === "Pending" ? "#9b6b2f" : c.submissionStatus === "Approved" ? "#4a8a4a" : "#b84a3e" }}>
                  {c.submissionStatus}
                </span>
              </div>
              <div style={{ fontFamily: "Space Mono", fontSize: "11px", color: "rgba(100,100,100,0.8)", marginBottom: "12px" }}>Domain: {c.domain} | ID: {c.trackingId}</div>
              <p style={{ fontSize: "15px", lineHeight: "1.5" }}>{c.description}</p>
              
              <div style={{ ...S.btnRow, marginTop: "16px", borderTop: "1px solid rgba(212,171,99,0.2)", paddingTop: "12px" }}>
                <button onClick={() => updateContributionStatus(c._id, "Approved")} disabled={c.submissionStatus === "Approved"} style={{ ...S.btn(c.submissionStatus === "Approved" ? "#eee" : "rgba(109,184,109,0.15)", c.submissionStatus === "Approved" ? "#aaa" : "#4a8a4a"), cursor: c.submissionStatus === "Approved" ? "not-allowed" : "pointer" }}>Approve</button>
                <button onClick={() => updateContributionStatus(c._id, "Rejected")} disabled={c.submissionStatus === "Rejected"} style={{ ...S.btn(c.submissionStatus === "Rejected" ? "#eee" : "rgba(208,94,82,0.15)", c.submissionStatus === "Rejected" ? "#aaa" : "#b84a3e"), cursor: c.submissionStatus === "Rejected" ? "not-allowed" : "pointer" }}>Reject</button>
                <button onClick={() => updateContributionStatus(c._id, "Pending")} disabled={c.submissionStatus === "Pending"} style={{ ...S.btn(c.submissionStatus === "Pending" ? "#eee" : "rgba(212,171,99,0.15)", c.submissionStatus === "Pending" ? "#aaa" : "#9b6b2f"), cursor: c.submissionStatus === "Pending" ? "not-allowed" : "pointer" }}>Set Pending</button>
              </div>
            </div>
          ))}
          {data.contributions.length === 0 && <p>No contributions found.</p>}
        </div>
      )}
    </div>
  );
}
