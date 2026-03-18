import { useState, useEffect } from "react";
import { API } from "../context/AuthContext";

const AI_PROXY = `${API}/ai`;
const getToken = () => localStorage.getItem("lm_token");

async function callAI(system, user, maxTokens = 800) {
  const body = { max_tokens: maxTokens, messages: [{ role: "user", content: user }] };
  if (system) body.system = system;
  const res = await fetch(AI_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
}

function downloadPDF(interview, topic) {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, pad = 20, cW = W - pad * 2;
    let y = 0;
    const line = (sz, text, bold = false, col = [42, 26, 8]) => {
      doc.setFontSize(sz); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setTextColor(...col);
      const lines = doc.splitTextToSize(String(text), cW);
      lines.forEach(l => { if (y > 272) { doc.addPage(); y = 20; } doc.text(l, pad, y); y += sz * 0.44; });
      y += 1.5;
    };
    doc.setFillColor(196, 146, 42); doc.rect(0, 0, W, 14, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("LIVING MEMORY — ODISHA TRADITIONAL KNOWLEDGE ARCHIVE", pad, 9);
    y = 22;
    line(18, topic, true);
    line(11, "Interview Knowledge Report", false, [155, 107, 47]);
    y += 3;
    doc.setDrawColor(212, 171, 99); doc.setLineWidth(0.4); doc.line(pad, y, W - pad, y); y += 6;
    const date = new Date(interview.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    line(10, `Interview Date: ${date}`, false, [92, 72, 52]);
    line(10, `Questions Answered: ${(interview.entries || []).filter(e => e.answer).length} / 20`, false, [92, 72, 52]);
    y += 4;
    const answered = (interview.entries || []).filter(e => e.answer);
    if (answered.length > 0) {
      doc.addPage(); y = 20;
      line(13, "Full Interview Transcript", true); y += 3;
      answered.forEach((e, i) => {
        line(9, `[${(e.type || "core").toUpperCase()}] L${e.layer || "?"} Q${i + 1}`, true, [155, 107, 47]);
        line(10, e.question, true, [92, 72, 52]);
        line(10, `A: ${e.answer}`); y += 4;
      });
    }
    for (let p = 1; p <= doc.internal.getNumberOfPages(); p++) {
      doc.setPage(p); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 140, 100);
      doc.text(`Living Memory Project · ${topic} · Page ${p} of ${doc.internal.getNumberOfPages()}`, pad, 290);
    }
    const safe = topic.replace(/[^a-z0-9]/gi, "_").substring(0, 35);
    doc.save(`LivingMemory_${safe}_${date.replace(/\s/g, "_")}.pdf`);
  };
  document.head.appendChild(script);
}

async function extractRichKnowledge(interview, topic) {
  const answered = (interview.entries || []).filter(e => e.answer);
  if (answered.length === 0) return { kmap: {}, portrait: null };
  const qa = answered.map(e => `[Layer ${e.layer || "?"}] Q: ${e.question}\nA: ${e.answer}`).join("\n\n");
  try {
    const basicResult = await callAI(
      `Extract structured knowledge from interview about "${topic}".
STRICT INSTRUCTION: ONLY extract knowledge that is EXPLICITLY STATED in the interview transcript. DO NOT invent, hallucinate, or add general domain knowledge. If an array is empty based on the transcript, leave it empty.
Return ONLY JSON: {"techniques":[],"materials":[],"tools":[],"treatmentProcess":[],"healingDuration":"","safetyPractices":[],"culturalSignificance":"","limitations":[],"transmission":"","keyInsights":[]}`,
      `Interview:\n${qa.substring(0, 2000)}`
    );
    const kmap = JSON.parse(basicResult.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const richResult = await callAI(
      `Extract rich knowledge portrait from interview about "${topic}" from Odisha.
STRICT INSTRUCTION: ONLY extract facts EXPLICITLY STATED in the interview transcript. DO NOT invent, hallucinate, or add general domain knowledge.
Return ONLY JSON with keys where data exists:\n{"sensory_indicators":[{"sense":"smell|touch|sound|sight|taste","indicator":"...","meaning":"...","quote":"..."}],"decision_rules":[{"condition":"...","action":"...","quote":"..."}],"failure_cases":[{"what_failed":"...","why":"...","lesson":"...","quote":"..."}],"teaching_warnings":[{"warning":"...","consequence":"...","quote":"..."}],"cultural_context":[{"belief":"...","practice":"...","quote":"..."}],"secret_knowledge":[{"knowledge":"...","why_rare":"...","quote":"..."}],"knowledge_gaps":[{"layer":1,"topic":"...","suggested_followup":"..."}],"elder_style":{"sentence_length":"short|medium|long","common_phrases":["..."]}}`,
      `Interview about "${topic}":\n${qa.substring(0, 3000)}`
    );
    const portrait = JSON.parse(richResult.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const coveredLayers = new Set(answered.filter(e => e.layer).map(e => e.layer));
    const completenessScore = Math.round((coveredLayers.size / 5) * 100);
    return { kmap, portrait, completenessScore };
  } catch { return { kmap: {}, portrait: null, completenessScore: 0 }; }
}

async function generateCombinedSummary(interviews, topic) {
  const allKmaps = interviews.filter(iv => iv.knowledgeMap && Object.keys(iv.knowledgeMap).length > 0).map(iv => iv.knowledgeMap);
  if (allKmaps.length === 0) return null;
  const combined = {};
  allKmaps.forEach(km => {
    Object.entries(km).forEach(([k, v]) => {
      if (!combined[k]) combined[k] = [];
      (Array.isArray(v) ? v : [v]).forEach(item => { if (item && !combined[k].includes(item)) combined[k].push(item); });
    });
  });
  try {
    const raw = JSON.stringify(combined).substring(0, 1500);
    const result = await callAI(
      `Deduplicate knowledge for "${topic}". STRICT INSTRUCTION: DO NOT ADD NEW FACTS. Only deduplicate the provided existing items. Return same JSON structure.`, 
      `Knowledge:\n${raw}`
    );
    return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch { return combined; }
}

function Dots() {
  return (<span style={{ display: "inline-flex", gap: "4px", alignItems: "center", verticalAlign: "middle" }}>
    {[0, 0.2, 0.4].map((d, i) => (<span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#c4922a", display: "inline-block", animation: `kbounce 0.8s ${d}s ease-in-out infinite` }} />))}
  </span>);
}

const LAYER_LABELS = {
  1: { label: "Story", color: "#c4922a", icon: "📖" },
  2: { label: "Senses", color: "#6db86d", icon: "🤲" },
  3: { label: "Failure", color: "#d05e52", icon: "⚠️" },
  4: { label: "Teaching", color: "#6688cc", icon: "🎓" },
  5: { label: "Why", color: "#9b6b9b", icon: "🌿" },
};

const KV = {
  techniques: { label: "Techniques Identified", icon: "⚙️" }, materials: { label: "Materials Used", icon: "🌿" },
  tools: { label: "Traditional Tools", icon: "🔧" }, treatmentProcess: { label: "Treatment Process", icon: "📋" },
  healingDuration: { label: "Healing Duration", icon: "⏱" }, safetyPractices: { label: "Safety Practices", icon: "🛡" },
  culturalSignificance: { label: "Cultural Significance", icon: "🏛" }, limitations: { label: "Limitations", icon: "⚠️" },
  transmission: { label: "Knowledge Transmission", icon: "📜" }, keyInsights: { label: "Key Insights", icon: "💡" },
};

function KnowledgeGrid({ kmap, compact = false }) {
  if (!kmap || Object.keys(kmap).length === 0) return null;
  const entries = Object.entries(kmap).filter(([, val]) => val && !(Array.isArray(val) && val.length === 0));
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(3, 1fr)" : "repeat(auto-fill,minmax(160px,1fr))", gap: "8px" }}>
      {entries.map(([key, val]) => {
        const meta = KV[key] || { label: key, icon: "•" };
        const items = Array.isArray(val) ? val : [val];
        return (
          <div key={key} style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(212,171,99,0.22)", borderRadius: "5px", padding: "9px 11px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "8px", color: "#9b7a50", marginBottom: "6px", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.icon} {meta.label.toUpperCase()}</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "5px", marginBottom: "3px", alignItems: "flex-start" }}>
                <span style={{ color: "#c4922a", flexShrink: 0, lineHeight: "1.4", fontSize: "10px" }}>•</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "13px", color: "#2a1a08", lineHeight: "1.4" }}>{item}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SensoryAtlas({ indicators }) {
  if (!indicators || indicators.length === 0) return null;
  const senses = { smell: [], touch: [], sound: [], sight: [], taste: [] };
  indicators.forEach(ind => { const s = (ind.sense || "").toLowerCase(); if (senses[s]) senses[s].push(ind); else senses.sight.push(ind); });
  const senseConfig = { smell: { icon: "👃", label: "Smell", color: "#9b6b2f" }, touch: { icon: "🤲", label: "Touch", color: "#6db86d" }, sound: { icon: "👂", label: "Sound", color: "#6688cc" }, sight: { icon: "👁", label: "Sight", color: "#c4922a" }, taste: { icon: "👅", label: "Taste", color: "#d05e52" } };
  const filledSenses = Object.entries(senses).filter(([, arr]) => arr.length > 0);
  if (filledSenses.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {filledSenses.map(([sense, items]) => {
        const cfg = senseConfig[sense];
        return (
          <div key={sense} style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}30`, borderRadius: "6px", padding: "8px 12px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: cfg.color, marginBottom: "6px" }}>{cfg.icon} {cfg.label.toUpperCase()}</div>
            {items.map((ind, i) => (
              <div key={i} style={{ marginBottom: "5px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "13px", color: "#2a1a08", fontWeight: "600" }}>{ind.indicator}</div>
                {ind.meaning && <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "12px", color: "#7b5a30", fontStyle: "italic" }}>→ {ind.meaning}</div>}
                {ind.quote && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#9b7a50", marginTop: "2px" }}>"{ind.quote}"</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SecretKnowledgePanel({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(155,107,47,0.08),rgba(196,146,42,0.05))", border: "1px solid rgba(196,146,42,0.4)", borderRadius: "8px", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "18px" }}>🔮</span>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#7b4c1a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Rare Knowledge</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "12px", color: "#9b7a50" }}>Not found in common databases</div>
        </div>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ borderLeft: "3px solid #c4922a", paddingLeft: "12px", marginBottom: "12px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "14px", color: "#2a1a08", fontWeight: "600", lineHeight: "1.5" }}>{item.knowledge}</div>
          {item.why_rare && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#9b6b2f", marginTop: "3px" }}>Why rare: {item.why_rare}</div>}
          {item.quote && <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "12px", color: "#7b5a30", fontStyle: "italic", marginTop: "4px" }}>"{item.quote}"</div>}
        </div>
      ))}
    </div>
  );
}

function KnowledgeGapsPanel({ gaps, layerCoverage }) {
  const missingLayers = layerCoverage ? Object.entries(layerCoverage).filter(([, v]) => !v).map(([k]) => parseInt(k)) : [];
  const hasGaps = (gaps && gaps.length > 0) || missingLayers.length > 0;
  if (!hasGaps) return null;
  return (
    <div style={{ background: "rgba(255,243,205,0.5)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: "8px", padding: "14px 18px" }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#7a5500", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>📋 Knowledge Gaps — Follow-up Suggested</div>
      {missingLayers.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          {missingLayers.map(l => {
            const meta = LAYER_LABELS[l];
            return (<span key={l} style={{ borderRadius: "4px", padding: "3px 8px", background: `${meta.color}14`, border: `1px solid ${meta.color}40`, fontFamily: "'Space Mono',monospace", fontSize: "9px", color: meta.color }}>{meta.icon} Layer {l} ({meta.label}) not covered</span>);
          })}
        </div>
      )}
      {gaps && gaps.map((gap, i) => (
        <div key={i} style={{ marginBottom: "8px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "13px", color: "#5a3a00", fontWeight: "600" }}>{gap.topic}</div>
          {gap.suggested_followup && <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "13px", color: "#7a5500", fontStyle: "italic", marginTop: "2px" }}>→ Suggested: "{gap.suggested_followup}"</div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function KnowledgeSection({ topic, domain }) {
  const [interviews, setInterviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [buildingCombined, setBuildingCombined] = useState(false);
  const [combinedKmap, setCombinedKmap] = useState(null);
  const [combinedReady, setCombinedReady] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("history");
  const [detailTab, setDetailTab] = useState("knowledge");

  useEffect(() => { loadInterviews(); }, [topic]);

  async function loadInterviews() {
    setLoading(true); setError(""); setSelected(null); setCombinedKmap(null); setCombinedReady(false);
    const token = getToken();
    if (!token) { setError("Please log in to view your interview history."); setLoading(false); return; }
    try {
      const res = await fetch(`${API}/interviews/history?topic=${encodeURIComponent(topic)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("lm_token"); throw new Error("Session expired. Please log in again."); }
      if (!res.ok) throw new Error("Unable to load interview history.");
      setInterviews(await res.json());
    } catch (err) { setError(err.message || "Unable to load interview history."); }
    setLoading(false);
  }

  async function openInterview(interview) {
    const hasKmap = interview.knowledgeMap && Object.keys(interview.knowledgeMap).length > 0;
    const hasPortrait = interview.knowledgePortrait && Object.keys(interview.knowledgePortrait).length > 0;
    if (!hasKmap || !hasPortrait) {
      setSelected({ ...interview, _loading: true }); setExtracting(true);
      const { kmap, portrait, completenessScore } = await extractRichKnowledge(interview, topic);
      const token = getToken();
      if (token && (kmap || portrait)) {
        try {
          await fetch(`${API}/interviews/${interview._id}/summary`, {
            method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ knowledgeSummary: Object.values(kmap || {}).flat().filter(v => typeof v === "string"), knowledgeMap: kmap || {}, knowledgePortrait: portrait || {}, completenessScore: completenessScore || 0, followUpNeeded: (completenessScore || 0) < 80, layerCoverage: interview.layerCoverage || {} }),
          });
        } catch {}
      }
      const updated = { ...interview, knowledgeMap: kmap, knowledgePortrait: portrait, completenessScore, _loading: false };
      setSelected(updated);
      setInterviews(prev => prev.map(iv => iv._id === interview._id ? updated : iv));
      setExtracting(false);
    } else { setSelected(interview); }
    setDetailTab("knowledge");
  }

  async function buildCombined() {
    setBuildingCombined(true);
    let enriched = [...interviews];
    for (let i = 0; i < enriched.length; i++) {
      if (!enriched[i].knowledgeMap || Object.keys(enriched[i].knowledgeMap).length === 0) {
        const { kmap } = await extractRichKnowledge(enriched[i], topic);
        enriched[i] = { ...enriched[i], knowledgeMap: kmap };
      }
    }
    const combined = await generateCombinedSummary(enriched, topic);
    setCombinedKmap(combined); setCombinedReady(true); setBuildingCombined(false);
  }

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); } catch { return "Unknown"; } };

  const S = {
    mono: (sz = "12px", col = "#9b7a50") => ({ fontFamily: "'Space Mono',monospace", fontSize: sz, color: col, letterSpacing: "0.06em" }),
    serif: (sz = "18px", col = "#2a1a08") => ({ fontFamily: "'Cormorant Garamond',serif", fontSize: sz, color: col, lineHeight: "1.6" }),
    title: { fontFamily: "'IM Fell DW Pica',serif", fontSize: "clamp(20px,2.5vw,26px)", color: "#2a1a08" },
    btn: (bg, col, bdr) => ({ padding: "10px 20px", borderRadius: "5px", background: bg, border: `1px solid ${bdr}`, color: col, fontFamily: "'Space Mono',monospace", fontSize: "11px", cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.05em", whiteSpace: "nowrap" }),
  };

  if (loading) return (<div style={{ padding: "48px", textAlign: "center" }}><Dots /><div style={{ ...S.mono("11px", "#9b7a50"), marginTop: "12px" }}>Loading interview history…</div><style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style></div>);
  if (error) return (<div style={{ padding: "40px 24px", textAlign: "center" }}><div style={{ fontSize: "28px", marginBottom: "10px" }}>🔒</div><div style={S.serif("16px", "#7b6b5a")}>{error}</div></div>);

  // ── DETAIL VIEW ──
  if (selected) {
    const answered = (selected.entries || []).filter(e => e.answer);
    const kmap = selected.knowledgeMap || {};
    const portrait = selected.knowledgePortrait || {};
    const lc = selected.layerCoverage || {};
    const score = selected.completenessScore || Math.round((Object.values(lc).filter(Boolean).length / 5) * 100);
    const sensory = portrait.sensory_indicators || [];
    const secrets = portrait.secret_knowledge || [];
    const gaps = portrait.knowledge_gaps || [];
    const failures = portrait.failure_cases || [];
    const warnings = portrait.teaching_warnings || [];
    const cultural = portrait.cultural_context || [];
    const decisions = portrait.decision_rules || [];

    const DETAIL_TABS = [
      { id: "knowledge", label: "📚 Knowledge" },
      { id: "sensory", label: `🤲 Senses${sensory.length > 0 ? ` (${sensory.length})` : ""}` },
      { id: "secret", label: `🔮 Rare${secrets.length > 0 ? ` (${secrets.length})` : ""}` },
      { id: "gaps", label: "📋 Gaps" },
      { id: "transcript", label: "📝 Transcript" },
    ];

    return (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px", height: "100%", boxSizing: "border-box", overflowY: "auto" }}>
        <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setSelected(null)} style={{ ...S.btn("rgba(212,171,99,0.12)", "#7b4c1a", "rgba(212,171,99,0.35)"), padding: "7px 12px" }}>← Back</button>
          <div style={{ flex: 1, display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            {[["DATE", formatDate(selected.createdAt)], ["Q/A", `${answered.length} / 20`], ["STATUS", selected.completed ? "✓ Done" : "⏸ Partial"]].map(([label, val]) => (
              <div key={label} style={{ display: "flex", gap: "5px", alignItems: "baseline" }}>
                <span style={S.mono("8px", "#b0a080")}>{label}</span>
                <span style={S.serif("13px", label === "STATUS" ? (selected.completed ? "#2a5a2a" : "#7a4f1f") : "#5a3a10")}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "12px", background: score >= 80 ? "rgba(109,184,109,0.12)" : score >= 50 ? "rgba(196,146,42,0.12)" : "rgba(208,94,82,0.08)", border: `1px solid ${score >= 80 ? "rgba(109,184,109,0.35)" : score >= 50 ? "rgba(196,146,42,0.35)" : "rgba(208,94,82,0.25)"}` }}>
              <span style={S.mono("9px", score >= 80 ? "#2a7a2a" : score >= 50 ? "#7a5500" : "#8a3028")}>{score}% depth</span>
            </div>
          </div>
          <button onClick={() => downloadPDF(selected, topic)} style={{ ...S.btn("linear-gradient(135deg,#9b6b2f,#7a4f1f)", "#f4edd6", "#7a4f1f"), padding: "7px 14px" }}>⬇ PDF</button>
        </div>
        {/* Layer coverage bar */}
        <div style={{ display: "flex", gap: "4px" }}>
          {[1,2,3,4,5].map(l => {
            const meta = LAYER_LABELS[l]; const covered = lc[l];
            return (<div key={l} title={meta.label} style={{ flex: 1, padding: "4px 2px", textAlign: "center", background: covered ? `${meta.color}12` : "rgba(200,200,200,0.06)", border: `1px solid ${covered ? `${meta.color}40` : "rgba(200,200,200,0.15)"}`, borderRadius: "4px" }}>
              <div style={{ fontSize: "11px", opacity: covered ? 1 : 0.25 }}>{meta.icon}</div>
              <div style={S.mono("7px", covered ? meta.color : "#c0b090")}>{meta.label}</div>
              <div style={S.mono("7px", covered ? "#2a5a2a" : "#c0a080")}>{covered ? "✓" : "—"}</div>
            </div>);
          })}
        </div>
        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(212,171,99,0.25)", overflowX: "auto" }}>
          {DETAIL_TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setDetailTab(id)} style={{ background: "none", border: "none", borderBottom: detailTab === id ? "2px solid #c4922a" : "2px solid transparent", color: detailTab === id ? "#c4922a" : "#9b7a50", padding: "7px 12px", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "9px", letterSpacing: "0.04em", whiteSpace: "nowrap", marginBottom: "-1px" }}>{label}</button>
          ))}
        </div>
        {(selected._loading || extracting) && (<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 0" }}><Dots /><span style={S.mono("11px", "#9b7a50")}>Extracting rich knowledge portrait…</span></div>)}

        {/* KNOWLEDGE TAB */}
        {detailTab === "knowledge" && !selected._loading && !extracting && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.keys(kmap).length > 0 ? (
              <div style={{ background: "rgba(255,252,242,0.8)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "7px", padding: "12px 14px" }}>
                <div style={{ ...S.mono("10px", "#7b4c1a"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>📚 Extracted Knowledge</div>
                <KnowledgeGrid kmap={kmap} compact={true} />
              </div>
            ) : (<div style={{ ...S.serif("14px", "#9b7a50"), fontStyle: "italic", padding: "12px 0" }}>No structured knowledge extracted yet.</div>)}
            {decisions.length > 0 && (
              <div style={{ background: "rgba(255,252,242,0.8)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "7px", padding: "12px 14px" }}>
                <div style={{ ...S.mono("10px", "#7b4c1a"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>⚡ Decision Rules</div>
                {decisions.map((d, i) => (<div key={i} style={{ marginBottom: "8px", borderLeft: "2px solid rgba(212,171,99,0.4)", paddingLeft: "10px" }}><div style={S.serif("13px", "#2a1a08")}><strong>IF</strong> {d.condition} <strong>→</strong> {d.action}</div>{d.quote && <div style={{ ...S.mono("9px", "#9b7a50"), marginTop: "2px" }}>"{d.quote}"</div>}</div>))}
              </div>
            )}
            {failures.length > 0 && (
              <div style={{ background: "rgba(255,243,205,0.4)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: "7px", padding: "12px 14px" }}>
                <div style={{ ...S.mono("10px", "#7a5500"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>⚠️ Failure Cases & Lessons</div>
                {failures.map((f, i) => (<div key={i} style={{ marginBottom: "8px", borderLeft: "2px solid rgba(208,94,82,0.4)", paddingLeft: "10px" }}><div style={S.serif("13px", "#5a2a08")}><strong>What failed:</strong> {f.what_failed}</div>{f.why && <div style={S.serif("12px", "#7a4a20")}>Why: {f.why}</div>}{f.lesson && <div style={{ ...S.serif("12px", "#2a5a2a"), marginTop: "2px" }}>Lesson: {f.lesson}</div>}</div>))}
              </div>
            )}
            {warnings.length > 0 && (
              <div style={{ background: "rgba(230,200,255,0.1)", border: "1px solid rgba(150,100,200,0.25)", borderRadius: "7px", padding: "12px 14px" }}>
                <div style={{ ...S.mono("10px", "#6b4c9b"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>🎓 Teaching Warnings</div>
                {warnings.map((w, i) => (<div key={i} style={{ marginBottom: "6px", borderLeft: "2px solid rgba(150,100,200,0.4)", paddingLeft: "10px" }}><div style={S.serif("13px", "#3a1a5a")}><strong>⚠</strong> {w.warning}</div>{w.consequence && <div style={S.serif("12px", "#6b4c9b")}>Consequence: {w.consequence}</div>}</div>))}
              </div>
            )}
          </div>
        )}
        {/* SENSORY TAB */}
        {detailTab === "sensory" && !selected._loading && !extracting && (
          <div>
            <div style={{ ...S.mono("10px", "#7b4c1a"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>🤲 Sensory Atlas — Embodied Knowledge</div>
            {sensory.length > 0 ? <SensoryAtlas indicators={sensory} /> : <div style={{ ...S.serif("14px", "#9b7a50"), fontStyle: "italic", padding: "12px 0" }}>No sensory indicators extracted yet. A follow-up focusing on Layer 2 would surface this.</div>}
            {cultural.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <div style={{ ...S.mono("10px", "#7b4c1a"), textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>🏛 Cultural Context</div>
                {cultural.map((c, i) => (<div key={i} style={{ marginBottom: "8px", borderLeft: "2px solid rgba(155,107,47,0.4)", paddingLeft: "10px" }}>{c.belief && <div style={S.serif("13px", "#2a1a08")}><strong>Belief:</strong> {c.belief}</div>}{c.practice && <div style={S.serif("13px", "#5a3a10")}>Practice: {c.practice}</div>}{c.quote && <div style={{ ...S.mono("9px", "#9b7a50"), marginTop: "2px" }}>"{c.quote}"</div>}</div>))}
              </div>
            )}
          </div>
        )}
        {/* SECRET TAB */}
        {detailTab === "secret" && !selected._loading && !extracting && (
          <div>
            <SecretKnowledgePanel items={secrets} />
            {secrets.length === 0 && <div style={{ ...S.serif("14px", "#9b7a50"), fontStyle: "italic", padding: "12px 0" }}>No rare knowledge flagged yet. This typically appears after Layer 5 questions.</div>}
          </div>
        )}
        {/* GAPS TAB */}
        {detailTab === "gaps" && !selected._loading && !extracting && (
          <div>
            <KnowledgeGapsPanel gaps={gaps} layerCoverage={lc} />
            {gaps.length === 0 && Object.values(lc).every(Boolean) && <div style={{ ...S.serif("14px", "#2a5a2a"), padding: "12px 0" }}>✓ All 5 knowledge layers have been covered. The knowledge portrait is complete.</div>}
          </div>
        )}
        {/* TRANSCRIPT TAB */}
        {detailTab === "transcript" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
            {answered.length === 0 ? <div style={{ ...S.serif("14px", "#9b7a50"), fontStyle: "italic" }}>No answers recorded yet.</div>
            : answered.map((e, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${e.type === "core" ? "rgba(212,171,99,0.5)" : e.type === "followup" ? "rgba(109,184,109,0.5)" : "rgba(100,150,220,0.5)"}`, paddingLeft: "10px" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "2px" }}>
                  <span style={{ ...S.mono("8px", e.type === "core" ? "#c4922a" : e.type === "followup" ? "#6db86d" : "#6688cc"), background: e.type === "core" ? "rgba(196,146,42,0.1)" : e.type === "followup" ? "rgba(109,184,109,0.1)" : "rgba(100,150,220,0.1)", padding: "1px 5px", borderRadius: "3px" }}>{e.type === "core" ? "CORE" : e.type === "followup" ? "FOLLOW-UP" : "DEEP-DIVE"}</span>
                  {e.layer && <span style={{ ...S.mono("8px", LAYER_LABELS[e.layer]?.color || "#9b7a50"), background: `${LAYER_LABELS[e.layer]?.color || "#9b7a50"}15`, padding: "1px 5px", borderRadius: "3px" }}>{LAYER_LABELS[e.layer]?.icon} L{e.layer} {LAYER_LABELS[e.layer]?.label}</span>}
                </div>
                <div style={{ ...S.serif("13px", "#5a3a10"), fontWeight: "600", margin: "3px 0 2px" }}>{e.question}</div>
                <div style={S.serif("13px", "#2a1a08")}>{e.answer}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  const completedInterviews = interviews.filter(iv => iv.completed);
  return (
    <div style={{ height: "100%", overflowY: "auto", boxSizing: "border-box", padding: "max(16px,2vw)", display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      <div>
        <div style={{ ...S.mono("10px", "#9b7a50"), marginBottom: "4px", textTransform: "uppercase" }}>Knowledge Repository</div>
        <div style={S.title}>{topic}</div>
      </div>
      {interviews.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[["🗂 Total Sessions", interviews.length], ["✓ Completed", completedInterviews.length]].map(([label, val]) => (
            <div key={label} style={{ flex: 1, minWidth: "100px", background: "rgba(212,171,99,0.08)", border: "1px solid rgba(212,171,99,0.25)", borderRadius: "6px", padding: "10px 14px", textAlign: "center" }}>
              <div style={S.mono("9px", "#b0a080")}>{label}</div>
              <div style={{ fontFamily: "'IM Fell DW Pica',serif", fontSize: "20px", color: "#2a1a08", marginTop: "2px" }}>{val}</div>
            </div>
          ))}
        </div>
      )}
      {interviews.length > 1 && (
        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(212,171,99,0.3)" }}>
          {[["history", "Interview History"], ["combined", "Combined Knowledge"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: activeTab === key ? "2px solid #c4922a" : "2px solid transparent", color: activeTab === key ? "#c4922a" : "#9b7a50", fontFamily: "'Space Mono',monospace", fontSize: "10px", cursor: "pointer", letterSpacing: "0.06em", marginBottom: "-1px" }}>{label.toUpperCase()}</button>
          ))}
        </div>
      )}
      {interviews.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
          <div style={S.serif("17px", "#7b6b5a")}>No interviews recorded yet for this topic.</div>
          <div style={{ ...S.serif("14px", "#9b8a7a"), marginTop: "6px" }}>Switch to the Record tab to start your first interview.</div>
        </div>
      )}
      {/* HISTORY TAB */}
      {(activeTab === "history" || interviews.length <= 1) && interviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {interviews.map((iv, idx) => {
            const answered = (iv.entries || []).filter(e => e.answer);
            const ivScore = iv.completenessScore || 0;
            const ivLc = iv.layerCoverage || {};
            const coveredCount = Object.values(ivLc).filter(Boolean).length;
            return (
              <button key={iv._id} onClick={() => openInterview(iv)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "rgba(255,252,242,0.8)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "8px", padding: "14px 18px", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: "8px" }}
                onMouseOver={e => (e.currentTarget.style.background = "rgba(212,171,99,0.1)")} onMouseOut={e => (e.currentTarget.style.background = "rgba(255,252,242,0.8)")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={S.mono("10px", "#9b7a50")}>Interview {interviews.length - idx}</div><div style={S.serif("17px", "#2a1a08")}>{formatDate(iv.createdAt)}</div></div>
                  <span style={{ fontSize: "18px", color: "#c4922a" }}>→</span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={S.mono("9px", "#b0a080")}>{answered.length} / 20 questions</span>
                  <span style={S.mono("9px", iv.completed ? "#2a7a2a" : "#c4922a")}>{iv.completed ? "✓ Complete" : "⏸ Partial"}</span>
                  {ivScore > 0 && <span style={S.mono("9px", ivScore >= 80 ? "#2a7a2a" : "#c4922a")}>{ivScore}% depth</span>}
                  {iv.knowledgeMap && Object.keys(iv.knowledgeMap).length > 0 && <span style={S.mono("9px", "#6688cc")}>📚 Knowledge extracted</span>}
                </div>
                {coveredCount > 0 && (
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[1,2,3,4,5].map(l => { const meta = LAYER_LABELS[l]; return (<div key={l} title={meta.label} style={{ flex: 1, height: "4px", borderRadius: "2px", background: ivLc[l] ? meta.color : "rgba(200,200,200,0.2)" }} />); })}
                  </div>
                )}
              </button>
            );
          })}
          <div style={{ ...S.mono("9px", "#b0a080"), textAlign: "center", paddingTop: "6px" }}>{interviews.length} interview{interviews.length > 1 ? "s" : ""} for this topic</div>
        </div>
      )}
      {/* COMBINED TAB */}
      {activeTab === "combined" && interviews.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {!combinedReady ? (
            <div style={{ textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>🧬</div>
              <div style={S.serif("16px", "#5a3a10")}>Combine knowledge from all {interviews.length} interviews.</div>
              <div style={{ ...S.serif("14px", "#9b8a7a"), marginTop: "6px", marginBottom: "20px" }}>AI will extract, deduplicate, and merge knowledge across all sessions.</div>
              {buildingCombined ? (<div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}><Dots /><span style={S.mono("11px", "#9b7a50")}>Building combined knowledge base…</span></div>)
              : (<button onClick={buildCombined} style={{ ...S.btn("linear-gradient(135deg,#9b6b2f,#7a4f1f)", "#f4edd6", "#7a4f1f"), fontSize: "11px", padding: "12px 28px" }}>Generate Combined Knowledge</button>)}
            </div>
          ) : (
            <div style={{ background: "rgba(240,255,240,0.6)", border: "1px solid rgba(100,180,100,0.3)", borderRadius: "8px", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <div><div style={{ ...S.mono("11px", "#2a5a2a"), textTransform: "uppercase", letterSpacing: "0.12em" }}>🧠 Combined Knowledge</div><div style={{ ...S.serif("14px", "#5a7a5a"), marginTop: "3px" }}>Aggregated from {interviews.length} interviews</div></div>
                <button onClick={buildCombined} style={S.btn("rgba(42,122,42,0.1)", "#2a5a2a", "rgba(42,122,42,0.3)")}>↻ Refresh</button>
              </div>
              {combinedKmap && Object.keys(combinedKmap).length > 0 ? <KnowledgeGrid kmap={combinedKmap} /> : <div style={S.serif("15px", "#9b7a50")}>No structured knowledge could be extracted yet.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
