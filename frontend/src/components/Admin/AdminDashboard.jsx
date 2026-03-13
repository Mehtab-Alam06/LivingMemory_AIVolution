import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard({ domainData }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [contributionTab, setContributionTab] = useState("Pending");
  const [data, setData] = useState({ users: [], chat: [], contributions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

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
        <div>
          {/* Sub-tabs for contributions */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {["Pending", "Approved", "Rejected"].map(status => (
              <button
                key={status}
                onClick={() => setContributionTab(status)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  border: contributionTab === status ? "2px solid #9b6b2f" : "1px solid rgba(212,171,99,0.3)",
                  background: contributionTab === status ? "rgba(212,171,99,0.15)" : "transparent",
                  color: contributionTab === status ? "#2a1a08" : "rgba(100,100,100,0.8)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: contributionTab === status ? "bold" : "normal"
                }}
              >
                {status} ({data.contributions.filter(c => c.submissionStatus === status).length})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {data.contributions.filter(c => c.submissionStatus === contributionTab).map(c => {
              const isExpanded = expandedId === c._id;
              return (
                <div key={c._id} style={{ ...S.card, padding: "20px", borderLeft: "4px solid " + (c.submissionStatus === "Pending" ? "#c4922a" : c.submissionStatus === "Approved" ? "#4a8c4a" : "#b03020") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: "20px", fontWeight: "bold" }}>{c.knowledgeTitle}</span>
                      <div style={{ fontFamily: "Space Mono", fontSize: "11px", color: "rgba(100,100,100,0.8)", marginTop: "4px" }}>
                        Submitted by: <strong style={{ color: "#2a1a08" }}>{c.name || c.userId?.name || "Unknown"}</strong> | Domain: {c.domain} | ID: {c.trackingId} | Date: {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <span style={{ fontFamily: "Space Mono", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", background: c.submissionStatus === "Pending" ? "rgba(212,171,99,0.2)" : c.submissionStatus === "Approved" ? "rgba(109,184,109,0.2)" : "rgba(208,94,82,0.2)", color: c.submissionStatus === "Pending" ? "#9b6b2f" : c.submissionStatus === "Approved" ? "#4a8a4a" : "#b84a3e" }}>
                        {c.submissionStatus}
                      </span>
                      <button onClick={() => setExpandedId(isExpanded ? null : c._id)} style={{ ...S.btn("rgba(0,0,0,0.05)", "#2a1a08"), padding: "4px 8px" }}>
                        {isExpanded ? "Collapse Details" : "View Full Details"}
                      </button>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: "15px", lineHeight: "1.5", marginBottom: isExpanded ? "16px" : "0", color: "#444" }}>{c.description}</p>
                  
                  {isExpanded && (
                    <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "20px", marginBottom: "16px", fontSize: "14px", border: "1px solid rgba(212,171,99,0.2)" }}>
                      <h4 style={{ margin: "0 0 16px", fontFamily: "'IM Fell DW Pica', serif", color: "#3a2010", fontSize: "20px", borderBottom: "1px solid rgba(212,171,99,0.2)", paddingBottom: "8px" }}>Complete Submission Details</h4>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div>
                          <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "2px" }}>Submitter Contact</strong>
                          <div>Name: {c.name || "N/A"}</div>
                          <div>Email: {c.email || "N/A"}</div>
                          {c.phone && <div>Phone: {c.phone}</div>}
                        </div>
                        <div>
                          <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "2px" }}>Location & Region</strong>
                          {c.country && <div>Country: {c.country}</div>}
                          {c.stateRegion && <div>State/Region: {c.stateRegion}</div>}
                          {c.knowledgeRegion && <div>Knowledge Region: {c.knowledgeRegion}</div>}
                        </div>
                        <div>
                          <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "2px" }}>Knowledge Attributes</strong>
                          <div>Domain: {c.domain}</div>
                          <div style={{ textTransform: "capitalize" }}>Ownership: {c.ownershipType}</div>
                          {c.knowledgeAge && <div>Age of Knowledge: {c.knowledgeAge}</div>}
                        </div>
                        <div>
                          <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "2px" }}>Permissions & Accreditations</strong>
                          <div>Publicly Shareable: {c.permissionStatus === 'yes' ? 'Yes' : c.permissionStatus === 'needs-approval' ? 'Needs community approval' : 'No'}</div>
                          <div>Confirmed Accuracy: {c.confirmAccuracy ? 'Yes' : 'No'}</div>
                          <div>Requests Credit: {c.creditedAuthor ? 'Yes' : 'No'}</div>
                        </div>
                      </div>

                      <div style={{ background: "rgba(196,146,42,0.05)", border: "1px solid rgba(196,146,42,0.1)", borderRadius: "6px", padding: "16px", marginBottom: "16px" }}>
                        <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>Detailed Explanation</strong>
                        <p style={{ margin: 0, color: "#2a1a08", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{c.explanation}</p>
                      </div>

                      {c.queryForTeam && (
                        <div style={{ background: "rgba(208,94,82,0.05)", border: "1px solid rgba(208,94,82,0.2)", borderRadius: "6px", padding: "16px", marginBottom: "16px" }}>
                          <strong style={{ color: "#b03020", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>Query / Message for Team</strong>
                          <p style={{ margin: 0, color: "#b03020", whiteSpace: "pre-wrap", fontStyle: "italic" }}>"{c.queryForTeam}"</p>
                        </div>
                      )}

                      {c.mediaFiles && c.mediaFiles.length > 0 && (
                        <div>
                          <strong style={{ color: "#7b6b5a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>Attached Media Files</strong>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {c.mediaFiles.map((file, idx) => (
                              <a key={idx} href={file.startsWith('http') ? file : `${import.meta.env.VITE_BACKEND_URL}${file}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#fff", border: "1px solid #c4922a", padding: "6px 12px", borderRadius: "4px", fontSize: "13px", color: "#9b6b2f", textDecoration: "none", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                                📎 View Attachment {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ ...S.btnRow, marginTop: isExpanded ? "0" : "16px", borderTop: "1px solid rgba(212,171,99,0.2)", paddingTop: "12px", justifyContent: "flex-end" }}>
                    {c.submissionStatus !== "Approved" && (
                      <button onClick={() => updateContributionStatus(c._id, "Approved")} style={{ ...S.btn("rgba(109,184,109,0.15)", "#4a8a4a"), padding: "8px 16px", fontSize: "13px", fontWeight: "bold" }}>Approve Contribution</button>
                    )}
                    {c.submissionStatus !== "Rejected" && (
                      <button onClick={() => updateContributionStatus(c._id, "Rejected")} style={{ ...S.btn("rgba(208,94,82,0.15)", "#b84a3e"), padding: "8px 16px", fontSize: "13px", fontWeight: "bold" }}>Reject</button>
                    )}
                    {c.submissionStatus !== "Pending" && (
                      <button onClick={() => updateContributionStatus(c._id, "Pending")} style={{ ...S.btn("rgba(212,171,99,0.15)", "#9b6b2f"), padding: "8px 16px", fontSize: "13px", fontWeight: "bold" }}>Move to Pending</button>
                    )}
                  </div>
                </div>
              );
            })}
            {data.contributions.filter(c => c.submissionStatus === contributionTab).length === 0 && (
              <p style={{ textAlign: "center", fontStyle: "italic", color: "rgba(100,100,100,0.8)", padding: "40px 0" }}>
                No {contributionTab.toLowerCase()} contributions found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
