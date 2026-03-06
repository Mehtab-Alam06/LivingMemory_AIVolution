import { useEffect, useMemo, useRef, useState } from "react";
import PaperCard from "./PaperCard.jsx";

function classify(title) {
  const t = title.toLowerCase();
  if (/(appli|pipili|cloth|stitch)/.test(t)) return "applique";
  if (/(herbal|medicine|plant|kadha)/.test(t)) return "herbal";
  if (/(lunar|calendar|agric|moon)/.test(t)) return "calendar";
  return "generic";
}

function questionsFor(domain) {
  switch (domain) {
    case "applique":
      return [
        "How did you learn this craft?",
        "What materials are traditionally used for cloth layering and temple use?",
        "How are patterns selected for temple canopies?",
        "Are there seasonal variations in production?",
        "What mistakes do beginners commonly make?",
        "What cultural meaning does this craft hold?",
      ];
    case "herbal":
      return [
        "How do you identify medicinal plants in your region?",
        "When is the best time to harvest them?",
        "How are remedies prepared (decoctions, pastes, infusions)?",
        "Are there dosage guidelines or age adjustments?",
        "Are certain plants sacred or restricted?",
      ];
    case "calendar":
      return [
        "How is the lunar calendar used to plan agricultural tasks?",
        "Which moon phases and wind patterns matter most?",
        "What soil signs or seasonal indicators guide decisions?",
        "How do you adjust for unusual weather patterns?",
        "Which rituals mark the sowing season?",
      ];
    default:
      return [
        "Please describe the tradition briefly.",
        "What materials and tools are essential?",
        "What is the step-by-step process?",
        "Are there seasonal or ritual aspects?",
        "What challenges or risks exist today?",
      ];
  }
}

export default function Interview({ title }) {
  const domain = useMemo(() => classify(title), [title]);
  const qs = useMemo(() => questionsFor(domain), [domain]);
  const [i, setI] = useState(0);
  const q = qs[i];
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState([]);
  const utterRef = useRef(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!q) return;
    try {
      const u = new SpeechSynthesisUtterance(q);
      u.lang = "en-IN";
      u.rate = 0.95;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      utterRef.current = u;
    } catch { void 0; }
  }, [q]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.onstart = () => {
        setRecording(true);
        setTimer(0);
        timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      };
      rec.onstop = () => {
        setRecording(false);
        clearInterval(timerRef.current);
      };
      recRef.current = rec;
      rec.start();
    } catch {
      setRecording(true);
    }
  };
  const stopRec = () => {
    try {
      recRef.current?.stop();
    } catch { void 0; }
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const save = () => {
    const a = { q, text };
    setAnswers((prev) => [...prev, a]);
    setText("");
    if (i + 1 < qs.length) setI(i + 1);
  };

  const done = i >= qs.length - 1 && answers.length >= qs.length - 1;
  const summary = {
    title,
    answers,
    structured: {
      Materials: domain === "applique" ? "Cotton cloth, mirror pieces, thread" :
        domain === "herbal" ? "Medicinal plants, water, mortar and pestle" :
        "Domain-specific materials",
      Process: domain === "applique" ? "Layering, cutting, stitching" :
        domain === "herbal" ? "Identification, harvest, preparation, dosage" :
        "Process steps",
      Cultural: domain === "applique" ? "Jagannath temple rituals" :
        domain === "herbal" ? "Sacred plant knowledge and taboos" :
        "Cultural context",
      Sustainability: domain === "applique" ? "Natural dyes, handmade production" :
        domain === "herbal" ? "Seasonal harvest, biodiversity respect" :
        "Sustainability indicators",
      Risks: "Decline factors, material availability, climate shifts",
    },
  };

  return (
    <div id="ai" className="interview container">
      <div className="interview-header">
        <h2>Interviewing Knowledge Holder: {title}</h2>
        <div className="tk-desc">
          {domain === "applique" && "Textile canopy craft — cloth layering, temple use, stitched motifs."}
          {domain === "herbal" && "Forest-based healing — identification, harvest, preparation, dosage."}
          {domain === "calendar" && "Lunar calendar agriculture — moon cycles, soil signs, seasonal indicators."}
        </div>
      </div>

      {!done && (
        <div className="interview-body">
          <div className={`ai-avatar ${speaking ? "speaking" : ""}`}>
            <div className={`avatar-figure ${speaking ? "speaking" : ""}`}></div>
            <div className="wave">{[...Array(5)].map((_, k) => <span key={k}></span>)}</div>
          </div>
          <div className="paper">
            <div className="paper-inner">
              <div className="ai-line">
                <div className="ai-label">AI</div>
                <div className="ai-text">“{q}”</div>
              </div>
              <div className="hint">Answer by speaking or typing below.</div>
              <div className="mic-box">
                {!recording ? (
                  <button className="mic" onClick={startRec}>Tap to Speak</button>
                ) : (
                  <button className="mic mic-on" onClick={stopRec}>Listening... {timer}s</button>
                )}
              </div>
              <div className="type-box">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Or type your response here…"
                />
                <button className="submit" onClick={save}>Save & Continue</button>
              </div>
              <div className="structuring">
                <div className="struct-title">Knowledge Structuring in Progress…</div>
                <ul>
                  <li>Materials</li>
                  <li>Process</li>
                  <li>Tools</li>
                  <li>Cultural Context</li>
                  <li>Sustainability Insight</li>
                  <li>Risks / Decline Factors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {done && (
        <PaperCard variant="default">
          <h2>Interview Structured Successfully.</h2>
          <div>Tradition: {summary.title}</div>
          <div className="preview">
            <div>Materials: {summary.structured.Materials}</div>
            <div>Process: {summary.structured.Process}</div>
            <div>Cultural Role: {summary.structured.Cultural}</div>
            <div>Sustainability: {summary.structured.Sustainability}</div>
          </div>
          <div className="actions">
            <button className="submit">Add to Knowledge Graph</button>
            <button className="submit">Generate AI Tutor Module</button>
            <button
              className="submit"
              onClick={() => {
                const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "interview-transcript.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Transcript
            </button>
          </div>
        </PaperCard>
      )}
    </div>
  );
}
