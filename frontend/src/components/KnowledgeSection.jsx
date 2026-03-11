import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AI_PROXY = `${BASE_URL}/api/ai`;

const getToken = () => {
  try {
    return JSON.parse(localStorage.getItem("lm_user") || "{}").token || null;
  } catch {
    return null;
  }
};

// ── AI call ───────────────────────────────────────────────────────────────────
async function callAI(system, user, maxTokens = 800) {
  const body = {
    max_tokens: maxTokens,
    messages: [{ role: "user", content: user }],
  };
  if (system) body.system = system;
  const res = await fetch(AI_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") || ""
  );
}

// ── Confidence score ──────────────────────────────────────────────────────────

// ── PDF download ──────────────────────────────────────────────────────────────
function downloadPDF(interview, topic) {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210,
      pad = 20,
      cW = W - pad * 2;
    let y = 0;

    const line = (sz, text, bold = false, col = [42, 26, 8]) => {
      doc.setFontSize(sz);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...col);
      const lines = doc.splitTextToSize(String(text), cW);
      lines.forEach((l) => {
        if (y > 272) {
          doc.addPage();
          y = 20;
        }
        doc.text(l, pad, y);
        y += sz * 0.44;
      });
      y += 1.5;
    };

    // Header
    doc.setFillColor(196, 146, 42);
    doc.rect(0, 0, W, 14, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("LIVING MEMORY — ODISHA TRADITIONAL KNOWLEDGE ARCHIVE", pad, 9);
    y = 22;

    line(18, topic, true);
    line(11, "Interview Knowledge Report", false, [155, 107, 47]);
    y += 3;
    doc.setDrawColor(212, 171, 99);
    doc.setLineWidth(0.4);
    doc.line(pad, y, W - pad, y);
    y += 6;

    const date = new Date(interview.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    line(10, `Interview Date: ${date}`, false, [92, 72, 52]);
    line(
      10,
      `Questions Answered: ${(interview.entries || []).filter((e) => e.answer).length} / 20`,
      false,
      [92, 72, 52],
    );
    y += 4;

    // Knowledge map
    if (
      interview.knowledgeMap &&
      Object.keys(interview.knowledgeMap).length > 0
    ) {
      doc.line(pad, y, W - pad, y);
      y += 7;
      line(13, "Structured Knowledge", true);
      y += 2;
      const KV_LABELS = {
        techniques: "Techniques",
        materials: "Materials",
        tools: "Tools",
        treatmentProcess: "Treatment Process",
        healingDuration: "Healing Duration",
        safetyPractices: "Safety Practices",
        culturalSignificance: "Cultural Significance",
        limitations: "Limitations",
        transmission: "Knowledge Transmission",
        keyInsights: "Key Insights",
      };
      Object.entries(interview.knowledgeMap).forEach(([k, v]) => {
        if (!v || (Array.isArray(v) && v.length === 0)) return;
        line(10, KV_LABELS[k] || k, true, [155, 107, 47]);
        (Array.isArray(v) ? v : [v]).forEach((item) => {
          line(10, `  • ${item}`);
        });
        y += 2;
      });
    }

    // Full transcript
    const answered = (interview.entries || []).filter((e) => e.answer);
    if (answered.length > 0) {
      doc.addPage();
      y = 20;
      line(13, "Full Interview Transcript", true);
      y += 3;
      answered.forEach((e, i) => {
        line(
          9,
          `[${(e.type || "core").toUpperCase()}] Q${i + 1}`,
          true,
          [155, 107, 47],
        );
        line(10, e.question, true, [92, 72, 52]);
        line(10, `A: ${e.answer}`);
        y += 4;
      });
    }

    // Footer
    for (let p = 1; p <= doc.internal.getNumberOfPages(); p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 140, 100);
      doc.text(
        `Living Memory Project · ${topic} · Page ${p} of ${doc.internal.getNumberOfPages()}`,
        pad,
        290,
      );
    }
    const safe = topic.replace(/[^a-z0-9]/gi, "_").substring(0, 35);
    doc.save(`LivingMemory_${safe}_${date.replace(/\s/g, "_")}.pdf`);
  };
  document.head.appendChild(script);
}

// ── Extract knowledge for an interview that doesn't have it yet ───────────────
async function extractKnowledge(interview, topic) {
  const answered = (interview.entries || []).filter((e) => e.answer);
  if (answered.length === 0) return {};
  const qa = answered
    .map((e) => `Q: ${e.question}\nA: ${e.answer}`)
    .join("\n\n");
  try {
    const result = await callAI(
      `Extract structured knowledge from a traditional knowledge interview about "${topic}".
       Return ONLY a JSON object using any of these keys where data exists:
       {"techniques":["..."],"materials":["..."],"tools":["..."],"treatmentProcess":["..."],"healingDuration":"...","safetyPractices":["..."],"culturalSignificance":"...","limitations":["..."],"transmission":"...","keyInsights":["..."]}
       No preamble. No markdown.`,
      `Interview:\n${qa.substring(0, 2000)}`,
    );
    return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch {
    return {};
  }
}

// ── Combine knowledge from multiple interviews ────────────────────────────────
async function generateCombinedSummary(interviews, topic) {
  const allKmaps = interviews
    .filter((iv) => iv.knowledgeMap && Object.keys(iv.knowledgeMap).length > 0)
    .map((iv) => iv.knowledgeMap);
  if (allKmaps.length === 0) return null;
  const combined = {};
  allKmaps.forEach((km) => {
    Object.entries(km).forEach(([k, v]) => {
      if (!combined[k]) combined[k] = [];
      const items = Array.isArray(v) ? v : [v];
      items.forEach((item) => {
        if (item && !combined[k].includes(item)) combined[k].push(item);
      });
    });
  });
  // Deduplicate semantically via AI
  try {
    const raw = JSON.stringify(combined).substring(0, 1500);
    const result = await callAI(
      `You are deduplicating and merging traditional knowledge entries for "${topic}".
       Remove duplicates, merge similar items, keep only factual unique points.
       Return the same JSON structure with deduplicated values. No preamble.`,
      `Knowledge to deduplicate:\n${raw}`,
    );
    return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch {
    return combined;
  }
}

// ── Dots loader ───────────────────────────────────────────────────────────────
function Dots() {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: "4px",
        alignItems: "center",
        verticalAlign: "middle",
      }}
    >
      {[0, 0.2, 0.4].map((d, i) => (
        <span
          key={i}
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "#c4922a",
            display: "inline-block",
            animation: `kbounce 0.8s ${d}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ── KV Label map ─────────────────────────────────────────────────────────────
const KV = {
  techniques: { label: "Techniques Identified", icon: "⚙️" },
  materials: { label: "Materials Used", icon: "🌿" },
  tools: { label: "Traditional Tools", icon: "🔧" },
  treatmentProcess: { label: "Treatment Process", icon: "📋" },
  healingDuration: { label: "Healing Duration", icon: "⏱" },
  safetyPractices: { label: "Safety Practices", icon: "🛡" },
  culturalSignificance: { label: "Cultural Significance", icon: "🏛" },
  limitations: { label: "Limitations", icon: "⚠️" },
  transmission: { label: "Knowledge Transmission", icon: "📜" },
  keyInsights: { label: "Key Insights", icon: "💡" },
};

function KnowledgeGrid({ kmap, compact = false }) {
  if (!kmap || Object.keys(kmap).length === 0) return null;
  const entries = Object.entries(kmap).filter(
    ([, val]) => val && !(Array.isArray(val) && val.length === 0),
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact
          ? "repeat(3, 1fr)"
          : "repeat(auto-fill,minmax(160px,1fr))",
        gap: "8px",
      }}
    >
      {entries.map(([key, val]) => {
        const meta = KV[key] || { label: key, icon: "•" };
        const items = Array.isArray(val) ? val : [val];
        return (
          <div
            key={key}
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(212,171,99,0.22)",
              borderRadius: "5px",
              padding: "9px 11px",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: "8px",
                color: "#9b7a50",
                marginBottom: "6px",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {meta.icon} {meta.label.toUpperCase()}
            </div>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "5px",
                  marginBottom: "3px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    color: "#c4922a",
                    flexShrink: 0,
                    lineHeight: "1.4",
                    fontSize: "10px",
                  }}
                >
                  •
                </span>
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: "13px",
                    color: "#2a1a08",
                    lineHeight: "1.4",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function KnowledgeSection({ topic, domain }) {
  const [interviews, setInterviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [buildingCombined, setBuildingCombined] = useState(false);
  const [combinedKmap, setCombinedKmap] = useState(null);
  const [combinedReady, setCombinedReady] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("history"); // history | combined

  useEffect(() => {
    loadInterviews();
  }, [topic]);

  async function loadInterviews() {
    setLoading(true);
    setError("");
    setSelected(null);
    setCombinedKmap(null);
    setCombinedReady(false);
    const token = getToken();
    if (!token) {
      setError("Please log in to view your interview history.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${BASE_URL}/api/interviews/history?topic=${encodeURIComponent(topic)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInterviews(data);
    } catch {
      setError(
        "Unable to load interview history. Please check your connection.",
      );
    }
    setLoading(false);
  }

  async function openInterview(interview) {
    // Extract knowledge if not already done
    if (
      !interview.knowledgeMap ||
      Object.keys(interview.knowledgeMap).length === 0
    ) {
      setSelected({ ...interview, _loading: true });
      setExtracting(true);
      const kmap = await extractKnowledge(interview, topic);
      const token = getToken();
      if (token && kmap && Object.keys(kmap).length > 0) {
        try {
          await fetch(`${BASE_URL}/api/interviews/${interview._id}/summary`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              knowledgeSummary: Object.values(kmap)
                .flat()
                .filter((v) => typeof v === "string"),
              knowledgeMap: kmap,
            }),
          });
        } catch {}
      }
      const updated = { ...interview, knowledgeMap: kmap, _loading: false };
      setSelected(updated);
      setInterviews((prev) =>
        prev.map((iv) =>
          iv._id === interview._id ? { ...iv, knowledgeMap: kmap } : iv,
        ),
      );
      setExtracting(false);
    } else {
      setSelected(interview);
    }
    setExtracting(false);
  }

  async function buildCombined() {
    setBuildingCombined(true);
    // Ensure all interviews have knowledge maps
    let enriched = [...interviews];
    for (let i = 0; i < enriched.length; i++) {
      if (
        !enriched[i].knowledgeMap ||
        Object.keys(enriched[i].knowledgeMap).length === 0
      ) {
        const kmap = await extractKnowledge(enriched[i], topic);
        enriched[i] = { ...enriched[i], knowledgeMap: kmap };
      }
    }
    const combined = await generateCombinedSummary(enriched, topic);
    setCombinedKmap(combined);
    setCombinedReady(true);
    setBuildingCombined(false);
  }

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const S = {
    mono: (sz = "10px", col = "#9b7a50") => ({
      fontFamily: "'Space Mono',monospace",
      fontSize: sz,
      color: col,
      letterSpacing: "0.06em",
    }),
    serif: (sz = "16px", col = "#2a1a08") => ({
      fontFamily: "'Cormorant Garamond',serif",
      fontSize: sz,
      color: col,
      lineHeight: "1.6",
    }),
    title: {
      fontFamily: "'IM Fell DW Pica',serif",
      fontSize: "clamp(17px,2.5vw,22px)",
      color: "#2a1a08",
    },
    card: (bg = "rgba(255,252,242,0.8)") => ({
      background: bg,
      border: "1px solid rgba(212,171,99,0.3)",
      borderRadius: "8px",
      padding: "16px 20px",
    }),
    btn: (bg, col, bdr) => ({
      padding: "9px 18px",
      borderRadius: "5px",
      background: bg,
      border: `1px solid ${bdr}`,
      color: col,
      fontFamily: "'Space Mono',monospace",
      fontSize: "10px",
      cursor: "pointer",
      transition: "all 0.2s",
      letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }),
  };

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <Dots />
        <div style={{ ...S.mono("11px", "#9b7a50"), marginTop: "12px" }}>
          Loading interview history…
        </div>
        <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔒</div>
        <div style={S.serif("16px", "#7b6b5a")}>{error}</div>
        <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      </div>
    );

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (selected) {
    const answered = (selected.entries || []).filter((e) => e.answer);
    const kmap = selected.knowledgeMap || {};

    return (
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          height: "100%",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>

        {/* Top bar: back + meta + download */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setSelected(null)}
            style={{
              ...S.btn(
                "rgba(212,171,99,0.12)",
                "#7b4c1a",
                "rgba(212,171,99,0.35)",
              ),
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "7px 12px",
            }}
          >
            ← Back
          </button>
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {[
              ["DATE", formatDate(selected.createdAt)],
              ["Q/A", `${answered.length} / 20`],
              ["STATUS", selected.completed ? "✓ Done" : "⏸ Partial"],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{ display: "flex", gap: "5px", alignItems: "baseline" }}
              >
                <span style={S.mono("8px", "#b0a080")}>{label}</span>
                <span
                  style={S.serif(
                    "13px",
                    label === "STATUS"
                      ? selected.completed
                        ? "#2a5a2a"
                        : "#7a4f1f"
                      : "#5a3a10",
                  )}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => downloadPDF(selected, topic)}
            style={{
              ...S.btn(
                "linear-gradient(135deg,#9b6b2f,#7a4f1f)",
                "#f4edd6",
                "#7a4f1f",
              ),
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "7px 14px",
            }}
          >
            ⬇ PDF
          </button>
        </div>

        {/* Extracted knowledge — full width, compact grid */}
        <div
          style={{
            background: "rgba(255,252,242,0.8)",
            border: "1px solid rgba(212,171,99,0.3)",
            borderRadius: "7px",
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              ...S.mono("10px", "#7b4c1a"),
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "10px",
            }}
          >
            📚 Extracted Knowledge
          </div>
          {selected._loading || extracting ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 0",
              }}
            >
              <Dots />
              <span style={S.mono("11px", "#9b7a50")}>
                Extracting knowledge…
              </span>
            </div>
          ) : Object.keys(kmap).length > 0 ? (
            <KnowledgeGrid kmap={kmap} compact={true} />
          ) : (
            <div style={{ ...S.serif("14px", "#9b7a50"), fontStyle: "italic" }}>
              No structured knowledge extracted yet.
            </div>
          )}
        </div>

        {/* Transcript — collapsible scroll area */}
        {answered.length > 0 && (
          <div
            style={{
              background: "rgba(255,252,242,0.8)",
              border: "1px solid rgba(212,171,99,0.3)",
              borderRadius: "7px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                ...S.mono("10px", "#7b4c1a"),
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "10px",
              }}
            >
              📝 Interview Transcript
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "280px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {answered.map((e, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${e.type === "core" ? "rgba(212,171,99,0.5)" : e.type === "followup" ? "rgba(109,184,109,0.5)" : "rgba(100,150,220,0.5)"}`,
                    paddingLeft: "10px",
                  }}
                >
                  <span
                    style={{
                      ...S.mono(
                        "8px",
                        e.type === "core"
                          ? "#c4922a"
                          : e.type === "followup"
                            ? "#6db86d"
                            : "#6688cc",
                      ),
                      background:
                        e.type === "core"
                          ? "rgba(196,146,42,0.1)"
                          : e.type === "followup"
                            ? "rgba(109,184,109,0.1)"
                            : "rgba(100,150,220,0.1)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                    }}
                  >
                    {e.type === "core"
                      ? "CORE"
                      : e.type === "followup"
                        ? "FOLLOW-UP"
                        : "DEEP-DIVE"}
                  </span>
                  <div
                    style={{
                      ...S.serif("13px", "#5a3a10"),
                      fontWeight: "600",
                      margin: "3px 0 2px",
                    }}
                  >
                    {e.question}
                  </div>
                  <div style={S.serif("13px", "#2a1a08")}>{e.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  const completedInterviews = interviews.filter((iv) => iv.completed);

  return (
    <div
      style={{
        padding: "max(16px,2vw)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <style>{`@keyframes kbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>

      {/* Header */}
      <div>
        <div
          style={{
            ...S.mono("10px", "#9b7a50"),
            marginBottom: "4px",
            textTransform: "uppercase",
          }}
        >
          Knowledge Repository
        </div>
        <div style={S.title}>{topic}</div>
      </div>

      {/* Stats strip */}
      {interviews.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            ["🗂 Total Interviews", interviews.length],
            ["✓ Completed", completedInterviews.length],
          ].map(([label, val]) => (
            <div
              key={label}
              style={{
                flex: 1,
                minWidth: "100px",
                background: "rgba(212,171,99,0.08)",
                border: "1px solid rgba(212,171,99,0.25)",
                borderRadius: "6px",
                padding: "10px 14px",
                textAlign: "center",
              }}
            >
              <div style={S.mono("9px", "#b0a080")}>{label}</div>
              <div
                style={{
                  fontFamily: "'IM Fell DW Pica',serif",
                  fontSize: "20px",
                  color: "#2a1a08",
                  marginTop: "2px",
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {interviews.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0",
            borderBottom: "1px solid rgba(212,171,99,0.3)",
          }}
        >
          {[
            ["history", "Interview History"],
            ["combined", "Combined Knowledge"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === key
                    ? "2px solid #c4922a"
                    : "2px solid transparent",
                color: activeTab === key ? "#c4922a" : "#9b7a50",
                fontFamily: "'Space Mono',monospace",
                fontSize: "10px",
                cursor: "pointer",
                letterSpacing: "0.06em",
                marginBottom: "-1px",
                transition: "color 0.2s",
              }}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {interviews.length <= 1 && (
        <div style={{ height: "1px", background: "rgba(212,171,99,0.3)" }} />
      )}

      {/* Empty state */}
      {interviews.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
          <div style={S.serif("17px", "#7b6b5a")}>
            No interviews recorded yet for this topic.
          </div>
          <div style={{ ...S.serif("14px", "#9b8a7a"), marginTop: "6px" }}>
            Switch to the Record tab to start your first interview.
          </div>
        </div>
      )}

      {/* HISTORY TAB ──────────────────────────────────────────────────────── */}
      {(activeTab === "history" || interviews.length <= 1) &&
        interviews.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {interviews.map((iv, idx) => {
              const answered = (iv.entries || []).filter((e) => e.answer);
              return (
                <button
                  key={iv._id}
                  onClick={() => openInterview(iv)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    background: "rgba(255,252,242,0.8)",
                    border: "1px solid rgba(212,171,99,0.3)",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "rgba(212,171,99,0.1)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "rgba(255,252,242,0.8)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      flex: 1,
                    }}
                  >
                    <div style={S.mono("10px", "#9b7a50")}>
                      Interview {interviews.length - idx}
                    </div>
                    <div style={S.serif("17px", "#2a1a08")}>
                      {formatDate(iv.createdAt)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginTop: "2px",
                      }}
                    >
                      <span style={S.mono("9px", "#b0a080")}>
                        {answered.length} / 20 questions
                      </span>
                      <span
                        style={{
                          ...S.mono(
                            "9px",
                            iv.completed ? "#2a7a2a" : "#c4922a",
                          ),
                        }}
                      >
                        {iv.completed ? "✓ Complete" : "⏸ Partial"}
                      </span>
                      {iv.knowledgeMap &&
                        Object.keys(iv.knowledgeMap).length > 0 && (
                          <span style={S.mono("9px", "#6688cc")}>
                            📚 Knowledge extracted
                          </span>
                        )}
                    </div>
                  </div>
                  <span style={{ fontSize: "18px", color: "#c4922a" }}>→</span>
                </button>
              );
            })}
            <div
              style={{
                ...S.mono("9px", "#b0a080"),
                textAlign: "center",
                paddingTop: "6px",
              }}
            >
              {interviews.length} interview{interviews.length > 1 ? "s" : ""}{" "}
              for this topic
            </div>
          </div>
        )}

      {/* COMBINED TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "combined" && interviews.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {!combinedReady ? (
            <div style={{ textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>🧬</div>
              <div style={S.serif("16px", "#5a3a10")}>
                Combine knowledge from all {interviews.length} interviews into a
                unified knowledge base.
              </div>
              <div
                style={{
                  ...S.serif("14px", "#9b8a7a"),
                  marginTop: "6px",
                  marginBottom: "20px",
                }}
              >
                The AI will extract, deduplicate, and merge knowledge across all
                sessions.
              </div>
              {buildingCombined ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Dots />
                  <span style={S.mono("11px", "#9b7a50")}>
                    Building combined knowledge base…
                  </span>
                </div>
              ) : (
                <button
                  onClick={buildCombined}
                  style={{
                    ...S.btn(
                      "linear-gradient(135deg,#9b6b2f,#7a4f1f)",
                      "#f4edd6",
                      "#7a4f1f",
                    ),
                    fontSize: "11px",
                    padding: "12px 28px",
                  }}
                >
                  Generate Combined Knowledge
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  background: "rgba(240,255,240,0.6)",
                  border: "1px solid rgba(100,180,100,0.3)",
                  borderRadius: "8px",
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "14px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        ...S.mono("11px", "#2a5a2a"),
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      🧠 Combined Knowledge
                    </div>
                    <div
                      style={{
                        ...S.serif("14px", "#5a7a5a"),
                        marginTop: "3px",
                      }}
                    >
                      Aggregated from {interviews.length} interviews
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={buildCombined}
                      style={{
                        ...S.btn(
                          "rgba(42,122,42,0.1)",
                          "#2a5a2a",
                          "rgba(42,122,42,0.3)",
                        ),
                      }}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>
                {combinedKmap && Object.keys(combinedKmap).length > 0 ? (
                  <KnowledgeGrid kmap={combinedKmap} />
                ) : (
                  <div style={S.serif("15px", "#9b7a50")}>
                    No structured knowledge could be extracted yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
