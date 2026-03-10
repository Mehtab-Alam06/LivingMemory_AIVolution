import React, { useState, useEffect } from "react";
import { useAuth, API } from "../../context/AuthContext";
import axios from "axios";

const DOMAINS = [
  "Traditional Medicine", "Agriculture", "Food Preservation",
  "Ecology / Environment", "Cultural Practices", "Craftsmanship",
  "Language / Oral Traditions", "Survival Skills", "Other",
];

const OWNERSHIP = [
  { value: "only-you", label: "Only me" },
  { value: "family", label: "My family" },
  { value: "community", label: "My community" },
  { value: "regional", label: "A wider regional group" },
];

const OWNERSHIP_LABELS = { "only-you": "Only me", family: "My family", community: "My community", regional: "A wider regional group" };

export default function ContributeKnowledge() {
  const { user, token } = useAuth();
  const [view, setView] = useState("landing");
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const [detailItem, setDetailItem] = useState(null);

  const [form, setForm] = useState({
    name: user?.name || "", email: user?.email || "", phone: "", country: "", stateRegion: "",
    knowledgeTitle: "", description: "", domain: "", ownershipType: "",
    knowledgeRegion: "", knowledgeAge: "", explanation: "",
    permissionStatus: "yes", confirmAccuracy: false, creditedAuthor: false,
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchStats(); fetchSubmissions(); }, []);

  const fetchStats = async () => {
    try { const { data } = await axios.get(`${API}/knowledge/stats`, { headers }); setStats(data); } catch {}
  };
  const fetchSubmissions = async () => {
    try { const { data } = await axios.get(`${API}/knowledge/my-submissions`, { headers }); setSubmissions(data); } catch {}
  };
  const fetchDetail = async (id) => {
    try {
      const { data } = await axios.get(`${API}/knowledge/submission/${id}`, { headers });
      setDetailItem(data);
    } catch {}
  };

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(""); };

  const validate = () => {
    if (step === 1) {
      if (!form.knowledgeTitle.trim()) return "Knowledge Title is required";
      if (!form.description.trim()) return "Brief description is required";
      if (!form.domain) return "Please select a domain category";
      if (!form.ownershipType) return "Please select ownership type";
    }
    if (step === 2) {
      if (!form.explanation.trim()) return "Please explain the knowledge";
      if (!form.confirmAccuracy) return "Please confirm the accuracy of your information";
    }
    return null;
  };

  const next = () => { const e = validate(); if (e) setError(e); else { setError(""); setStep(s => s + 1); } };
  const prev = () => { setError(""); setStep(s => s - 1); };

  const submit = async () => {
    const e = validate(); if (e) { setError(e); return; }
    setSubmitting(true); setError("");
    try {
      const { data } = await axios.post(`${API}/knowledge/submit`, form, { headers });
      setTrackingId(data.trackingId); setView("success");
      fetchStats(); fetchSubmissions();
    } catch (err) { setError(err.response?.data?.errors?.[0] || err.response?.data?.error || "Submission failed. Please try again."); }
    setSubmitting(false);
  };

  const reset = () => {
    setForm({ name: user?.name || "", email: user?.email || "", phone: "", country: "", stateRegion: "",
      knowledgeTitle: "", description: "", domain: "", ownershipType: "", knowledgeRegion: "", knowledgeAge: "",
      explanation: "", permissionStatus: "yes", confirmAccuracy: false, creditedAuthor: false });
    setStep(0); setError(""); setView("landing");
  };

  // ── Styles ──
  const inp = { width: "100%", padding: "12px 15px", boxSizing: "border-box", background: "rgba(255,255,255,.55)", border: "1px solid rgba(155,107,47,.28)", borderRadius: 4, color: "#2a1508", fontFamily: "Cormorant Garamond,serif", fontSize: 17, outline: "none", marginBottom: 14, transition: "border-color .2s, box-shadow .2s" };
  const sel = { ...inp, cursor: "pointer", appearance: "auto" };
  const ta = { ...inp, resize: "vertical", minHeight: 90, lineHeight: 1.6 };
  const lbl = { display: "block", fontFamily: "Space Mono,monospace", fontSize: 10, letterSpacing: ".14em", color: "rgba(92,51,23,.58)", textTransform: "uppercase", marginBottom: 7 };
  const errBox = { background: "rgba(208,94,82,.08)", border: "1px solid rgba(208,94,82,.3)", borderRadius: 4, padding: "9px 13px", fontFamily: "Cormorant Garamond,serif", fontSize: 15, color: "#b03020", marginBottom: 14, textAlign: "center", fontStyle: "italic" };
  const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
  const stepLabels = ["Your Details", "Knowledge Info", "Explain & Submit"];

  // ── Parchment Card wrapper ──
  const parchCard = (children, extra = {}) => (
    <div style={{
      background: "linear-gradient(170deg, #f5edd8 0%, #ede0be 45%, #e4d4a8 100%)",
      border: "1px solid rgba(155,107,47,.32)", borderRadius: 6,
      boxShadow: "0 0 0 1px rgba(155,107,47,.08), 0 40px 100px rgba(0,0,0,.88), inset 0 1px 0 rgba(255,255,255,.45)",
      overflow: "hidden", ...extra
    }}>{children}</div>
  );
  const ornament = (pt = "18px 0 0", pb) => (
    <div style={{ textAlign: "center", padding: pb ? `0 0 ${pb}` : pt, color: "rgba(155,107,47,.42)", fontSize: 13, letterSpacing: 7 }}>✦ ❧ ✦</div>
  );

  // ── Contact Footer ──
  const contactFooter = (
    <div style={{ marginTop: 40, textAlign: "center" }}>
      <div style={{ borderTop: "1px solid rgba(155,107,47,.15)", paddingTop: 20, marginBottom: 10 }}>
        <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".14em", color: "rgba(212,171,99,.35)", textTransform: "uppercase", marginBottom: 10 }}>Need Help? Contact Us</div>
        <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 15, color: "rgba(212,171,99,.55)", lineHeight: 1.8 }}>
          📧 livingmemory104@gmail.com<br/>📍 GIFT, Bhubaneswar, Odisha, India<br/>🌐 Living Memory — AI Knowledge Preservation
        </div>
      </div>
      <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".14em", color: "rgba(212,171,99,.16)", textTransform: "uppercase", marginTop: 14 }}>
        Preserving the Wisdom of Odisha Before It Is Lost Forever
      </div>
    </div>
  );

  const CSS = `
    @keyframes ckIn { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
    @keyframes ckPulse { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes ckGlow { 0%,100%{text-shadow:0 0 20px rgba(212,171,99,.15),0 0 40px rgba(212,171,99,.08)} 50%{text-shadow:0 0 30px rgba(212,171,99,.35),0 0 60px rgba(212,171,99,.18)} }
    @keyframes ckGlowSub { 0%,100%{text-shadow:0 0 12px rgba(212,171,99,.08)} 50%{text-shadow:0 0 20px rgba(212,171,99,.2)} }
    .ck-inp:focus { border-color:rgba(155,107,47,.65)!important; box-shadow:0 0 0 3px rgba(155,107,47,.1)!important; }
    .ck-sub-box { transition: all .25s cubic-bezier(.4,0,.2,1); cursor:pointer; }
    .ck-sub-box:hover { transform:translateY(-3px) scale(1.01); box-shadow:0 8px 28px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.5)!important; border-color:rgba(155,107,47,.5)!important; }
    .ck-rdo { display:flex; align-items:center; gap:10px; padding:9px 14px; background:rgba(255,255,255,.35); border:1px solid rgba(155,107,47,.2); border-radius:4px; cursor:pointer; font-family:Cormorant Garamond,serif; font-size:16px; color:#5a2e0a; transition:all .15s; margin-bottom:6px; }
    .ck-rdo:hover { background:rgba(155,107,47,.1); }
    .ck-rdo.on { background:rgba(155,107,47,.15); border-color:rgba(155,107,47,.45); }
    .ck-rdo input { display:none; }
    .ck-chk { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; background:rgba(255,255,255,.3); border:1px solid rgba(155,107,47,.18); border-radius:4px; cursor:pointer; font-family:Cormorant Garamond,serif; font-size:15px; color:rgba(92,51,23,.7); transition:all .15s; margin-bottom:8px; line-height:1.5; }
    .ck-chk:hover { background:rgba(155,107,47,.08); }
    .ck-chk.on { background:rgba(155,107,47,.12); border-color:rgba(155,107,47,.35); color:#5a2e0a; }
    .ck-chk input { display:none; }
    .ck-mark { width:18px; height:18px; min-width:18px; border:2px solid rgba(155,107,47,.35); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:11px; color:#7b4c1a; margin-top:2px; transition:all .15s; }
    .ck-chk.on .ck-mark { background:rgba(155,107,47,.2); border-color:#9b6b2f; }
    .ck-btn:hover:not(:disabled) { background:linear-gradient(135deg,#c4922a,#9b6b2f)!important; box-shadow:0 6px 24px rgba(155,107,47,.4)!important; transform:translateY(-1px); }
    .ck-btn-sec:hover { background:rgba(155,107,47,.15)!important; }
    @media(max-width:600px) { .ck-row { grid-template-columns:1fr!important; } .ck-stats-grid { grid-template-columns:1fr 1fr!important; } }
  `;

  // ═══════ DETAIL MODAL ═══════
  if (detailItem) {
    const d = detailItem;
    const fieldRow = (label, val) => val ? (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".12em", color: "rgba(92,51,23,.5)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "#3a2010", lineHeight: 1.6 }}>{val}</div>
      </div>
    ) : null;
    const statusColor = d.submissionStatus === "Approved" ? "#4a8c4a" : d.submissionStatus === "Rejected" ? "#b03020" : "#c4922a";

    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>
        <style>{CSS}</style>
        <div style={{ animation: "ckIn .4s ease" }}>
          {parchCard(<>
            {ornament()}
            <div style={{ padding: "24px 34px 28px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 24, color: "#3a2010", fontWeight: "normal", margin: "0 0 4px" }}>{d.knowledgeTitle}</h2>
                  <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, color: "rgba(92,51,23,.4)", letterSpacing: ".1em" }}>
                    {d.trackingId} · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase",
                  padding: "4px 10px", borderRadius: 3, border: `1px solid ${statusColor}40`,
                  background: `${statusColor}18`, color: statusColor, whiteSpace: "nowrap"
                }}>{d.submissionStatus}</span>
              </div>

              <div style={{ borderTop: "1px solid rgba(155,107,47,.15)", paddingTop: 16 }}>
                {fieldRow("Domain", d.domain)}
                {fieldRow("Description", d.description)}
                {fieldRow("Ownership", OWNERSHIP_LABELS[d.ownershipType] || d.ownershipType)}
                {fieldRow("Region Practiced", d.knowledgeRegion)}
                {fieldRow("Age of Knowledge", d.knowledgeAge)}
                {fieldRow("Explanation", d.explanation)}
                {fieldRow("Submitted By", `${d.name || "—"} (${d.email || "—"})`)}
                {fieldRow("Country / State", [d.country, d.stateRegion].filter(Boolean).join(", ") || null)}
                {fieldRow("Permission", d.permissionStatus === "yes" ? "Yes, publicly shareable" : d.permissionStatus === "no" ? "No" : "Needs community approval")}
                {d.creditedAuthor && fieldRow("Credit", "Wants to be credited")}
              </div>

              <button className="ck-btn" onClick={() => setDetailItem(null)} style={{
                width: "100%", padding: "13px", marginTop: 8,
                background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)",
                border: "none", borderRadius: 4, color: "#f5edd8",
                fontFamily: "IM Fell DW Pica,serif", fontSize: 17,
                cursor: "pointer", boxShadow: "0 4px 18px rgba(155,107,47,.3)", transition: "all .2s"
              }}>← Back to Dashboard</button>
            </div>
            {ornament(null, "16px")}
          </>)}
        </div>
        {contactFooter}
      </div>
    );
  }

  // ═══════ SUCCESS ═══════
  if (view === "success") {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px" }}>
        <style>{CSS}</style>
        <div style={{ animation: "ckIn .5s ease", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14, textShadow: "0 0 30px rgba(212,171,99,.4)" }}>✦</div>
          {parchCard(<>
            {ornament()}
            <div style={{ padding: "28px 38px 32px" }}>
              <h2 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 26, color: "#3a2010", fontWeight: "normal", margin: "0 0 8px" }}>Thank You for Contributing</h2>
              <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "rgba(92,51,23,.6)", lineHeight: 1.7, margin: "0 0 24px", fontStyle: "italic" }}>
                Our research and verification team will review your submission. If additional information is needed, we will contact you.
              </p>
              <div style={{ display: "inline-block", padding: "14px 28px", background: "rgba(155,107,47,.08)", border: "1px dashed rgba(155,107,47,.3)", borderRadius: 6, marginBottom: 20 }}>
                <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".14em", color: "rgba(92,51,23,.45)", textTransform: "uppercase", marginBottom: 6 }}>Tracking ID</div>
                <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 24, color: "#7b4c1a", letterSpacing: ".04em" }}>{trackingId}</div>
              </div>
              <div><button className="ck-btn" onClick={reset} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none", borderRadius: 4, color: "#f5edd8", fontFamily: "IM Fell DW Pica,serif", fontSize: 18, cursor: "pointer", boxShadow: "0 4px 18px rgba(155,107,47,.3)", transition: "all .2s" }}>← Back to Dashboard</button></div>
            </div>
            {ornament(null, "16px")}
          </>)}
        </div>
        {contactFooter}
      </div>
    );
  }

  // ═══════ FORM ═══════
  if (view === "form") {
    return (
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "32px 20px" }}>
        <style>{CSS}</style>
        <div style={{ animation: "ckIn .4s ease" }}>
          {/* Progress */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
            {stepLabels.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Mono,monospace", fontSize: 11, background: i <= step ? "rgba(155,107,47,.2)" : "rgba(212,171,99,.08)", border: `2px solid ${i <= step ? "#9b6b2f" : "rgba(212,171,99,.2)"}`, color: i <= step ? "#d4ab63" : "rgba(212,171,99,.3)", transition: "all .3s", boxShadow: i === step ? "0 0 10px rgba(212,171,99,.25)" : "none" }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".08em", color: i <= step ? "rgba(212,171,99,.65)" : "rgba(212,171,99,.25)", textTransform: "uppercase" }}>{l}</span>
                {i < 2 && <span style={{ color: "rgba(212,171,99,.15)", margin: "0 4px" }}>—</span>}
              </div>
            ))}
          </div>

          {parchCard(<>
            {ornament()}
            <div style={{ padding: "24px 34px 28px" }}>
              {error && <div style={errBox}>{error}</div>}

              {step === 0 && (<>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>📋</div>
                  <h3 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 22, color: "#3a2010", fontWeight: "normal", margin: 0 }}>Your Details</h3>
                  <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, color: "rgba(92,51,23,.5)", fontStyle: "italic", margin: "5px 0 0" }}>Auto-filled from your account</p>
                </div>
                <div className="ck-row" style={row}>
                  <div><label style={lbl}>Full Name</label><input className="ck-inp" style={inp} value={form.name} onChange={e => set("name", e.target.value)} /></div>
                  <div><label style={lbl}>Email</label><input className="ck-inp" style={inp} type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                </div>
                <div className="ck-row" style={row}>
                  <div><label style={lbl}>Phone <span style={{ opacity: .4 }}>(optional)</span></label><input className="ck-inp" style={inp} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91..." /></div>
                  <div><label style={lbl}>Country</label><input className="ck-inp" style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. India" /></div>
                </div>
                <label style={lbl}>State / Region</label>
                <input className="ck-inp" style={inp} value={form.stateRegion} onChange={e => set("stateRegion", e.target.value)} placeholder="e.g. Odisha" />
              </>)}

              {step === 1 && (<>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>📖</div>
                  <h3 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 22, color: "#3a2010", fontWeight: "normal", margin: 0 }}>Knowledge Information</h3>
                  <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, color: "rgba(92,51,23,.5)", fontStyle: "italic", margin: "5px 0 0" }}>Tell us about the knowledge you wish to preserve</p>
                </div>
                <label style={lbl}>Knowledge Title <span style={{ color: "#b03020" }}>*</span></label>
                <input className="ck-inp" style={inp} value={form.knowledgeTitle} onChange={e => set("knowledgeTitle", e.target.value)} placeholder="e.g. Traditional Paddy Drying Method" />
                <label style={lbl}>Brief Description <span style={{ color: "#b03020" }}>*</span></label>
                <textarea className="ck-inp" style={{ ...ta, minHeight: 70 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="A short summary..." />
                <div className="ck-row" style={row}>
                  <div><label style={lbl}>Domain <span style={{ color: "#b03020" }}>*</span></label><select className="ck-inp" style={sel} value={form.domain} onChange={e => set("domain", e.target.value)}><option value="">Select...</option>{DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label style={lbl}>Ownership <span style={{ color: "#b03020" }}>*</span></label><select className="ck-inp" style={sel} value={form.ownershipType} onChange={e => set("ownershipType", e.target.value)}><option value="">Select...</option>{OWNERSHIP.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                </div>
                <div className="ck-row" style={row}>
                  <div><label style={lbl}>Region Practiced</label><input className="ck-inp" style={inp} value={form.knowledgeRegion} onChange={e => set("knowledgeRegion", e.target.value)} placeholder="e.g. Western Odisha" /></div>
                  <div><label style={lbl}>Age of Knowledge</label><select className="ck-inp" style={sel} value={form.knowledgeAge} onChange={e => set("knowledgeAge", e.target.value)}><option value="">Select...</option><option value="<50 years">Less than 50 years</option><option value="50-100 years">50–100 years</option><option value="100-500 years">100–500 years</option><option value="500+ years">500+ years</option><option value="Unknown">Unknown</option></select></div>
                </div>
              </>)}

              {step === 2 && (<>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>✍</div>
                  <h3 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 22, color: "#3a2010", fontWeight: "normal", margin: 0 }}>Explain & Submit</h3>
                  <p style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 14, color: "rgba(92,51,23,.5)", fontStyle: "italic", margin: "5px 0 0" }}>Describe the knowledge in detail</p>
                </div>
                <label style={lbl}>Explain the knowledge step-by-step <span style={{ color: "#b03020" }}>*</span></label>
                <textarea className="ck-inp" style={{ ...ta, minHeight: 120 }} value={form.explanation} onChange={e => set("explanation", e.target.value)} placeholder="Describe the knowledge, when it's used, what problem it solves, materials involved..." />

                <label style={lbl}>Permission to share publicly</label>
                <div style={{ marginBottom: 14 }}>
                  {[{ v: "yes", l: "Yes, I have permission" }, { v: "no", l: "No" }, { v: "needs-approval", l: "Needs community approval" }].map(o => (
                    <label key={o.v} className={`ck-rdo ${form.permissionStatus === o.v ? "on" : ""}`}>
                      <input type="radio" name="perm" value={o.v} checked={form.permissionStatus === o.v} onChange={e => set("permissionStatus", e.target.value)} />
                      <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${form.permissionStatus === o.v ? "#9b6b2f" : "rgba(155,107,47,.3)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                        {form.permissionStatus === o.v && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9b6b2f" }} />}
                      </span>
                      {o.l}
                    </label>
                  ))}
                </div>

                <label className={`ck-chk ${form.confirmAccuracy ? "on" : ""}`}>
                  <input type="checkbox" checked={form.confirmAccuracy} onChange={e => set("confirmAccuracy", e.target.checked)} />
                  <span className="ck-mark">{form.confirmAccuracy ? "✓" : ""}</span>
                  I confirm that the information provided is accurate to the best of my knowledge. <span style={{ color: "#b03020" }}>*</span>
                </label>
                <label className={`ck-chk ${form.creditedAuthor ? "on" : ""}`}>
                  <input type="checkbox" checked={form.creditedAuthor} onChange={e => set("creditedAuthor", e.target.checked)} />
                  <span className="ck-mark">{form.creditedAuthor ? "✓" : ""}</span>
                  I would like to be credited if this knowledge is published.
                </label>
              </>)}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {step > 0 && <button className="ck-btn-sec" onClick={prev} style={{ flex: 1, padding: "13px", background: "rgba(155,107,47,.08)", border: "1px solid rgba(155,107,47,.25)", borderRadius: 4, color: "#7b4c1a", fontFamily: "IM Fell DW Pica,serif", fontSize: 17, cursor: "pointer", transition: "all .2s" }}>← Previous</button>}
                {step < 2 ? (
                  <button className="ck-btn" onClick={next} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none", borderRadius: 4, color: "#f5edd8", fontFamily: "IM Fell DW Pica,serif", fontSize: 18, cursor: "pointer", boxShadow: "0 4px 18px rgba(155,107,47,.3)", transition: "all .2s" }}>Next Step →</button>
                ) : (
                  <button className="ck-btn" onClick={submit} disabled={submitting} style={{ flex: 1, padding: "13px", background: submitting ? "rgba(155,107,47,.3)" : "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none", borderRadius: 4, color: "#f5edd8", fontFamily: "IM Fell DW Pica,serif", fontSize: 18, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 18px rgba(155,107,47,.3)", transition: "all .2s" }}>
                    {submitting ? "⏳ Submitting..." : "✦ Submit Knowledge →"}
                  </button>
                )}
              </div>
            </div>
            {ornament(null, "16px")}
          </>)}
        </div>
        {contactFooter}
      </div>
    );
  }

  // ═══════ LANDING ═══════
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>
      <style>{CSS}</style>
      <div style={{ animation: "ckIn .4s ease" }}>
        {/* Glowing Hero */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10, animation: "ckPulse 3s ease-in-out infinite" }}>📜</div>
          <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 34, color: "#f0e8d8", lineHeight: 1.1, marginBottom: 8, animation: "ckGlow 3s ease-in-out infinite" }}>
            Contribute <em style={{ color: "#d4ab63", fontStyle: "normal" }}>Knowledge</em>
          </div>
          <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "rgba(237,224,190,.55)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto", animation: "ckGlowSub 4s ease-in-out infinite", fontStyle: "italic" }}>
            If you possess traditional, cultural, or experiential knowledge that could benefit future generations, submit it here. Our research team will review and contact you if needed.
          </div>
        </div>

        {/* Stats Card */}
        {parchCard(<>
          {ornament("14px 0 0")}
          <div style={{ padding: "16px 28px 22px" }}>
            <h3 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 18, color: "#3a2010", fontWeight: "normal", margin: "0 0 14px", textAlign: "center" }}>
              📊 Contributor Stats — {user?.name || "You"}
            </h3>
            <div className="ck-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { v: stats.total, l: "Submitted", c: "#7b4c1a" },
                { v: stats.pending, l: "Under Review", c: "#c4922a" },
                { v: stats.approved, l: "Approved", c: "#4a8c4a" },
                { v: stats.rejected, l: "Rejected", c: "#b03020" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: "10px 4px", background: "rgba(155,107,47,.06)", border: "1px solid rgba(155,107,47,.12)", borderRadius: 4 }}>
                  <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 26, color: s.c, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontFamily: "Space Mono,monospace", fontSize: 8, letterSpacing: ".1em", color: "rgba(92,51,23,.45)", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <button className="ck-btn" onClick={() => setView("form")} style={{ width: "100%", padding: "14px", marginTop: 18, background: "linear-gradient(135deg,#9b6b2f,#7b4c1a)", border: "none", borderRadius: 4, color: "#f5edd8", fontFamily: "IM Fell DW Pica,serif", fontSize: 19, cursor: "pointer", boxShadow: "0 4px 18px rgba(155,107,47,.3)", transition: "all .2s" }}>
              ✦ Start Contribution →
            </button>
          </div>
          {ornament(null, "12px")}
        </>, { marginBottom: 20 })}

        {/* Submissions in Parchment Boxes */}
        {submissions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 18, color: "rgba(237,224,190,.7)", fontWeight: "normal", margin: "0 0 14px", textAlign: "center" }}>
              📋 Your Submissions
            </h4>
            {submissions.map(s => {
              const sc = s.submissionStatus === "Approved" ? "#4a8c4a" : s.submissionStatus === "Rejected" ? "#b03020" : "#c4922a";
              return (
                <div key={s._id} className="ck-sub-box" onClick={() => fetchDetail(s._id)} style={{
                  background: "linear-gradient(170deg, #f5edd8 0%, #ede0be 60%, #e4d4a8 100%)",
                  border: "1px solid rgba(155,107,47,.28)", borderRadius: 6,
                  boxShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.4)",
                  padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontFamily: "IM Fell DW Pica,serif", fontSize: 17, color: "#3a2010", marginBottom: 3 }}>{s.knowledgeTitle}</div>
                    <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, color: "rgba(92,51,23,.4)", letterSpacing: ".08em" }}>
                      {s.trackingId} · {s.domain} · {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontFamily: "Space Mono,monospace", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase",
                      padding: "4px 10px", borderRadius: 3, border: `1px solid ${sc}40`, background: `${sc}15`, color: sc
                    }}>{s.submissionStatus}</span>
                    <span style={{ color: "rgba(155,107,47,.4)", fontSize: 14 }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {contactFooter}
    </div>
  );
}
