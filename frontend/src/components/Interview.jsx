import { useState, useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
const AI_PROXY = `${BASE_URL}/api/ai`;

// ── TTS ───────────────────────────────────────────────────────────────────────
// Chrome has a bug that silently cuts off speech after ~200 chars.
// Fix: split into sentence chunks, speak them sequentially.
function speak(text, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  try {
    window.speechSynthesis.cancel();

    // Split on sentence boundaries, keeping punctuation
    const raw = text.trim();
    const chunks = raw.match(/[^.!?]+[.!?]*/g) || [raw];
    const cleaned = chunks.map(c => c.trim()).filter(c => c.length > 0);
    if (cleaned.length === 0) { onEnd?.(); return; }

    let idx = 0;
    let cancelled = false;

    // Chrome keepAlive: re-call resume() every 10s to prevent cutting off
    const keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 10000);

    function speakChunk() {
      if (cancelled || idx >= cleaned.length) {
        clearInterval(keepAliveTimer);
        onEnd?.();
        return;
      }
      const u = new SpeechSynthesisUtterance(cleaned[idx]);
      u.rate = 0.88; u.pitch = 1.0; u.lang = "en-IN";
      u.onend  = () => { idx++; speakChunk(); };
      u.onerror = (e) => {
        // "interrupted" is fired when we cancel intentionally — treat as done
        if (e.error === "interrupted") { clearInterval(keepAliveTimer); return; }
        idx++; speakChunk();
      };
      window.speechSynthesis.speak(u);
    }

    speakChunk();

    // Return cancel handle (used by window.speechSynthesis.cancel() callers)
    return () => { cancelled = true; clearInterval(keepAliveTimer); window.speechSynthesis.cancel(); };
  } catch { onEnd?.(); }
}

// ── AI call ───────────────────────────────────────────────────────────────────
async function callAI(system, user, maxTokens = 800) {
  const body = { max_tokens: maxTokens, messages: [{ role: "user", content: user }] };
  if (system) body.system = system;
  const res  = await fetch(AI_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sKey     = (t) => `lm_sess_${t.replace(/[^a-z0-9]/gi, "_")}`;
const qKey     = (t) => `lm_qs_${t.replace(/[^a-z0-9]/gi, "_")}`;
const getToken = () => { try { return JSON.parse(localStorage.getItem("lm_user") || "{}").token || null; } catch { return null; } };

const ACKS = ["That's very helpful, thank you.", "I appreciate you sharing that.", "That's quite interesting.", "Thank you for explaining that.", "I'd like to understand this better."];
let ackIdx = 0;
const getAck = (use) => use ? ACKS[ackIdx++ % ACKS.length] : "";

const PHASE = { INIT: "init", CHECKING: "checking", LOADING: "loading", PAUSED: "paused", ACTIVE: "active", DONE: "done" };
const CORE_Q = 15, FINAL_Q = 5;

// ── Question pool: 25 base questions per coverage area ───────────────────────
// These are rephrased variants AI will choose from + rephrase further
const BASE_QUESTION_POOL = (topic) => [
  // Learning & origin (4)
  `How did you first learn ${topic}?`,
  `Who taught you ${topic} and how did that learning happen?`,
  `At what age did you begin learning ${topic}?`,
  `Was ${topic} passed down in your family or community?`,
  // Materials (4)
  `What materials are used in ${topic}?`,
  `Where do you source the materials needed for ${topic}?`,
  `Are there specific qualities you look for when selecting materials for ${topic}?`,
  `Have the materials used in ${topic} changed over time?`,
  // Preparation & process (4)
  `Can you walk me through the preparation process step by step?`,
  `What is the most critical step in preparing for ${topic}?`,
  `How long does the full process of ${topic} take from start to finish?`,
  `Are there any preparatory rituals or conditions needed before performing ${topic}?`,
  // Tools (3)
  `What traditional tools are used in ${topic}?`,
  `Are any of the tools for ${topic} made by hand?`,
  `Have modern tools replaced any traditional ones used in ${topic}?`,
  // Application & technique (4)
  `How exactly is ${topic} applied or performed?`,
  `What physical techniques are central to ${topic}?`,
  `How do you know when ${topic} has been performed correctly?`,
  `Are there variations in technique between different practitioners?`,
  // Safety & limitations (3)
  `What safety precautions must practitioners follow?`,
  `In what situations should ${topic} not be used?`,
  `Have you seen cases where ${topic} caused harm? What went wrong?`,
  // Cultural & effectiveness (4)
  `What is the cultural or spiritual significance of ${topic}?`,
  `How effective is this practice in your experience?`,
  `Has the community's trust in ${topic} changed over generations?`,
  `What would be lost if ${topic} disappeared?`,
  // Transmission & future (4)
  `How is knowledge of ${topic} passed to the next generation?`,
  `Are young people interested in learning ${topic} today?`,
  `What challenges do practitioners of ${topic} face today?`,
  `What should future generations preserve about ${topic}?`,
];

export default function AIInterview({ topic, domain, userName, onSave }) {
  const [phase,         setPhase]         = useState(PHASE.INIT);
  const [coreQuestions, setCoreQuestions] = useState([]);
  const [entries,       setEntries]       = useState([]);
  const [currentEntry,  setCurrentEntry]  = useState(null);
  const [inputText,     setInputText]     = useState("");
  const [isRecording,   setIsRecording]   = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [isThinking,    setIsThinking]    = useState(false);
  const [validMsg,      setValidMsg]      = useState("");
  const [loadingMsg,    setLoadingMsg]    = useState("Checking your session…");
  const [savedId,       setSavedId]       = useState(null);
  const [images,        setImages]        = useState([]);
  const [greeting,      setGreeting]      = useState("");
  const [coreIndex,     setCoreIndex]     = useState(0);
  const [followupCount, setFollowupCount] = useState(0);
  const [finalCount,    setFinalCount]    = useState(0);
  const [knowledgeMap,  setKnowledgeMap]  = useState(null);
  const [ack,           setAck]           = useState("");

  const recRef     = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    checkSession();
    return () => { window.speechSynthesis?.cancel(); recRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (phase === PHASE.ACTIVE || phase === PHASE.PAUSED) {
      sessionStorage.setItem(sKey(topic), JSON.stringify({ coreIndex, followupCount, finalCount, entries, phase }));
      if (coreQuestions.length) sessionStorage.setItem(qKey(topic), JSON.stringify(coreQuestions));
    }
  }, [coreIndex, followupCount, finalCount, entries, phase]);

  // ── Check session ─────────────────────────────────────────────────────────
  async function checkSession() {
    setPhase(PHASE.CHECKING);
    const ss = sessionStorage.getItem(sKey(topic));
    const sq = sessionStorage.getItem(qKey(topic));
    if (ss && sq) {
      try {
        const { coreIndex: ci, followupCount: fc, finalCount: fnc, entries: ent, phase: ph } = JSON.parse(ss);
        const qs = JSON.parse(sq);
        if (qs.length > 0 && ent?.length > 0) {
          setCoreQuestions(qs); setEntries(ent); setCoreIndex(ci || 0);
          setFollowupCount(fc || 0); setFinalCount(fnc || 0);
          fetchImages(topic);
          setCurrentEntry(ent.find(e => e.answer === null) || null);
          setGreeting(`Namaskar ${userName || ""}. Welcome back. Continuing your interview on "${topic}".`);
          setPhase(ph === PHASE.DONE ? PHASE.DONE : PHASE.PAUSED);
          return;
        }
      } catch {}
    }
    const token = getToken();
    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/api/interviews/resume?topic=${encodeURIComponent(topic)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data?.questions?.length > 0 && data.entries?.length > 0) {
            setCoreQuestions(data.questions); setEntries(data.entries);
            setCoreIndex(data.currentQuestionIndex || 0); setFollowupCount(data.followupCount || 0); setFinalCount(data.finalCount || 0);
            setSavedId(data._id || null);
            sessionStorage.setItem(sKey(topic), JSON.stringify({ coreIndex: data.currentQuestionIndex || 0, followupCount: data.followupCount || 0, finalCount: data.finalCount || 0, entries: data.entries, phase: data.completed ? PHASE.DONE : PHASE.PAUSED }));
            sessionStorage.setItem(qKey(topic), JSON.stringify(data.questions));
            fetchImages(topic);
            setCurrentEntry(data.entries.find(e => e.answer === null) || null);
            setGreeting(`Namaskar ${userName || ""}. Welcome back. Resuming from where you left off.`);
            if (data.completed) { setPhase(PHASE.DONE); return; }
            setPhase(PHASE.PAUSED);
            return;
          }
        }
      } catch {}
    }
    initInterview();
  }

  // ── Init: adaptive question generation ───────────────────────────────────
  async function initInterview() {
    setPhase(PHASE.LOADING);
    setLoadingMsg("Researching traditional knowledge…");
    try {
      // Fetch previous interview knowledge gaps from backend
      const token = getToken();
      let priorKnowledge = "";
      let previousInterviewCount = 0;
      if (token) {
        try {
          const hRes = await fetch(`${BASE_URL}/api/interviews/history?topic=${encodeURIComponent(topic)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (hRes.ok) {
            const history = await hRes.json();
            previousInterviewCount = history.length;
            if (history.length > 0) {
              // Collect what has already been covered
              const allAnswers = history.flatMap(iv => (iv.entries || []).filter(e => e.answer).map(e => `Q: ${e.question}\nA: ${e.answer}`));
              priorKnowledge = allAnswers.slice(-20).join("\n\n").substring(0, 1500);
            }
          }
        } catch {}
      }

      setLoadingMsg("Preparing your personalised questions…");

      const pool = BASE_QUESTION_POOL(topic);
      // Shuffle pool to randomise starting point
      const shuffled = [...pool].sort(() => Math.random() - 0.5);

      // Build AI prompt — varies wording + fills knowledge gaps if prior interviews exist
      const gapInstruction = priorKnowledge
        ? `IMPORTANT: Previous interviews already covered some aspects. Prioritise questions that probe UNCOVERED areas based on this prior knowledge:\n${priorKnowledge.substring(0, 800)}\nAlso add 2–3 questions specifically targeting knowledge gaps not addressed in prior interviews.`
        : `This is the FIRST interview for this topic. Cover a broad range of aspects.`;

      const raw = await callAI(
        `You are an expert knowledge researcher documenting traditional knowledge of Odisha, India.
         You will receive a pool of candidate questions. Your job is to:
         1. SELECT the 15 most valuable questions from the pool for this interview session
         2. REPHRASE each selected question with slightly different wording (same meaning, different words)
         3. Ensure questions sound natural and conversational, max 15 words each
         4. ${gapInstruction}
         Return ONLY a numbered list of 15 rephrased questions:
         1. Question
         2. Question`,
        `Topic: "${topic}", Odisha, India.\nQuestion pool (choose 15, rephrase them):\n${shuffled.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nReturn 15 rephrased questions:`,
        1800
      );

      const parsed = raw.split("\n")
        .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter(l => l.length > 8 && l.length < 200)
        .slice(0, 15);

      const qs = parsed.length >= 12 ? parsed : shuffled.slice(0, 15);
      setCoreQuestions(qs);
      sessionStorage.setItem(qKey(topic), JSON.stringify(qs));

      const firstEntry = { type: "core", question: qs[0], answer: null, parentIndex: null };
      setEntries([firstEntry]);
      setCurrentEntry(firstEntry);
      setCoreIndex(0); setFollowupCount(0); setFinalCount(0);

      const greet = `Namaskar ${userName || ""}. Thank you for sharing your knowledge about ${topic}. Let's begin.`;
      setGreeting(greet);
      setPhase(PHASE.ACTIVE);
      fetchImages(topic);

      // Speak greeting → Q0
      const speakQ0 = () => {
        const q0 = qs[0];
        if (!q0) return;
        setIsSpeaking(true);
        let done = false;
        const onDone = () => { if (!done) { done = true; setIsSpeaking(false); } };
        speak(q0, onDone);
        setTimeout(onDone, Math.max(q0.length * 120, 8000));
      };
      let greetDone = false;
      const afterGreet = () => { if (greetDone) return; greetDone = true; speakQ0(); };
      speak(greet, afterGreet);
      setTimeout(afterGreet, Math.max(greet.length * 120, 8000));

    } catch (err) {
      console.error("Init error:", err);
      setLoadingMsg("Connection error. Please refresh and try again.");
    }
  }

  async function fetchImages(query) {
    try {
      const t = await callAI(null, `Give 2 Wikimedia Commons image URLs for "${query} Odisha". ONLY JSON array: ["url1","url2"]`, 200);
      const urls = JSON.parse(t.match(/\[[\s\S]*?\]/)?.[0] || "[]");
      if (urls.length) setImages(urls.slice(0, 2));
    } catch {}
  }

  // ── Analyze answer & decide next ─────────────────────────────────────────
  async function analyzeAndDecideNext(answer, entrySnapshot, coreIdx, fpCount, fnCount, allEntries) {
    setIsThinking(true);
    const answeredEntries = allEntries.filter(e => e.answer !== null);
    const histStr = answeredEntries.map(e => `[${e.type.toUpperCase()}] Q: ${e.question}\nA: ${e.answer}`).join("\n\n");
    const isFinalPhase = coreIdx >= CORE_Q;

    // ── FINAL PHASE ───────────────────────────────────────────────────────
    if (isFinalPhase) {
      if (fnCount >= FINAL_Q) { setIsThinking(false); await endInterview(allEntries); return; }
      const finalQ = await callAI(
        `You are wrapping up a traditional knowledge interview about "${topic}" from Odisha.
         Based on the full interview, identify ONE remaining knowledge gap about the PRACTICE ITSELF and ask about it.
         Max 15 words. Do NOT ask about people, personal stories, or anything not directly about the practice.
         Do NOT repeat any previous question.`,
        `Full interview:\n${histStr}\n\nFinal question ${fnCount + 1} of ${FINAL_Q} (about the practice only):`
      );
      const q = finalQ?.trim() || `Is there anything important about ${topic} we have not yet covered?`;
      const newEntry = { type: "final", question: q, answer: null, parentIndex: null };
      setEntries(prev => [...prev, newEntry]);
      setCurrentEntry(newEntry);
      setFinalCount(fnCount + 1);
      setAck("");
      setIsThinking(false);
      speakQuestion(q);
      return;
    }

    // ── FOLLOW-UP DECISION ────────────────────────────────────────────────
    let shouldFollowUp = false;
    let followUpQ = "";

    if (fpCount < 2 && answer.trim().split(/\s+/).length >= 10) {
      const decision = await callAI(
        `You are documenting traditional knowledge about "${topic}" from Odisha, India.
         Decide if the answer needs a follow-up question about THE PRACTICE ITSELF.

         STRICT RULES:
         - ONLY ask about: techniques, materials, tools, steps, safety, timing, effects, cultural aspects of "${topic}"
         - NEVER ask about: people mentioned (mentors, family, teachers), personal history, emotions, or anything not directly about the practice
         - If the answer mentions a person (e.g. "my mentor taught me"), ignore the person — focus on WHAT technique or material was described, not WHO taught it
         - FOLLOWUP: answer is detailed and reveals something about the practice worth probing deeper
         - CLARIFY: answer is vague or too short — ask them to describe the technique/process/material more specifically
         - NEXT: answer is complete and covers the question well

         Return ONLY JSON: {"decision":"FOLLOWUP"|"CLARIFY"|"NEXT","question":"..."}
         question: max 15 words, strictly about the practice.`,
        `Topic: "${topic}"\nQuestion: "${entrySnapshot.question}"\nAnswer: "${answer}"\nHistory:\n${histStr.substring(0, 600)}`
      );
      try {
        const parsed = JSON.parse(decision.match(/\{[\s\S]*?\}/)?.[0] || "{}");
        if (parsed.decision === "FOLLOWUP" || parsed.decision === "CLARIFY") {
          shouldFollowUp = true;
          followUpQ = parsed.question || "Could you describe that process in more detail?";
        }
      } catch {}
    }

    const useAck = answeredEntries.length % 3 === 0 && answeredEntries.length > 0;
    const ackText = getAck(useAck);
    setAck(ackText);

    if (shouldFollowUp) {
      const newEntry = { type: "followup", question: followUpQ, answer: null, parentIndex: coreIdx };
      setEntries(prev => [...prev, newEntry]);
      setCurrentEntry(newEntry);
      setFollowupCount(fpCount + 1);
      setIsThinking(false);
      speakQuestion(followUpQ, ackText);
      return;
    }

    const nextCoreIdx = coreIdx + 1;
    if (nextCoreIdx >= CORE_Q) {
      setCoreIndex(nextCoreIdx);
      setFollowupCount(0);
      setIsThinking(false);
      await analyzeAndDecideNext("", { type: "transition" }, nextCoreIdx, 0, fnCount, allEntries);
      return;
    }

    const nextQ = coreQuestions[nextCoreIdx];
    const newEntry = { type: "core", question: nextQ, answer: null, parentIndex: null };
    setEntries(prev => [...prev, newEntry]);
    setCurrentEntry(newEntry);
    setCoreIndex(nextCoreIdx);
    setFollowupCount(0);
    setIsThinking(false);
    speakQuestion(nextQ, ackText);
  }

  function speakQuestion(q, ackPrefix = "") {
    if (!q) return;
    const toSpeak = ackPrefix ? `${ackPrefix} ${q}` : q;
    setIsSpeaking(true);
    let done = false;
    const onDone = () => { if (!done) { done = true; setIsSpeaking(false); } };
    speak(toSpeak, onDone);
    setTimeout(onDone, Math.max(toSpeak.length * 120, 8000));
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  async function validate(answer) {
    const trivial = ["yes", "no", "ok", "okay", "sure", "idk", "fine", "yeah", "nah", "hmm", "uh", "um", "i don't know", "dont know", "maybe", "nothing"];
    const t = answer.trim().toLowerCase();
    if (t.length < 8 || trivial.includes(t) || answer.trim().split(/\s+/).length < 3) return false;
    try {
      const r = await callAI("Reply with ONLY: RELEVANT or NOT_RELEVANT", `Topic: "${topic}"\nQuestion: "${currentEntry?.question}"\nAnswer: "${answer}"\nRelevant?`);
      return r.trim().toUpperCase().includes("RELEVANT");
    } catch { return true; }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submitAnswer() {
    const answer = inputText.trim();
    if (!answer || isThinking || isSpeaking || !currentEntry) return;
    setIsThinking(true); setValidMsg("");
    const ok = await validate(answer);
    if (!ok) { setValidMsg(`Please provide an answer related to ${topic}.`); setIsThinking(false); return; }
    const updatedEntries = entries.map(e => e === currentEntry ? { ...e, answer } : e);
    setEntries(updatedEntries);
    setInputText(""); setValidMsg(""); setAck("");
    await saveProgress(updatedEntries, coreIndex, followupCount, finalCount, false);
    await analyzeAndDecideNext(answer, currentEntry, coreIndex, followupCount, finalCount, updatedEntries);
  }

  // ── Extract knowledge map ─────────────────────────────────────────────────
  async function extractKnowledgeMap(allEntries) {
    const answered = allEntries.filter(e => e.answer);
    const qa = answered.map(e => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n");
    try {
      const result = await callAI(
        `Extract structured knowledge from a traditional knowledge interview about "${topic}" from Odisha.
         Return ONLY a JSON object. Use only keys where you have real data:
         {"techniques":["..."],"materials":["..."],"tools":["..."],"treatmentProcess":["..."],"healingDuration":"...","safetyPractices":["..."],"culturalSignificance":"...","limitations":["..."],"transmission":"...","keyInsights":["..."]}
         Be concise, factual. No preamble. No markdown.`,
        `Interview:\n${qa.substring(0, 2000)}`
      );
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || "{}");
    } catch { return {}; }
  }

  // ── End interview ─────────────────────────────────────────────────────────
  async function endInterview(allEntries) {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); setIsRecording(false);
    const kmap = await extractKnowledgeMap(allEntries || entries);
    setKnowledgeMap(kmap);
    setPhase(PHASE.DONE);
    sessionStorage.removeItem(sKey(topic)); sessionStorage.removeItem(qKey(topic));
    await saveProgress(allEntries || entries, coreIndex, followupCount, finalCount, true, kmap);
  }

  async function pauseInterview() {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); setIsRecording(false);
    setPhase(PHASE.PAUSED);
    await saveProgress(entries, coreIndex, followupCount, finalCount, false);
  }

  async function saveProgress(ents, ci, fc, fnc, completed, kmap) {
    try {
      const token   = getToken();
      const answered = (ents || entries).filter(e => e.answer);
      const payload = {
        topic, domain, userName: userName || "Anonymous",
        questions: coreQuestions, entries: ents || entries,
        answers: answered.map(e => e.answer),
        messages: answered.map(e => ([{ role: "ai", text: e.question, type: "question" }, { role: "user", text: e.answer, type: "normal" }])).flat(),
        currentQuestionIndex: ci, followupCount: fc, finalCount: fnc,
        questionCount: answered.length, completed: !!completed,
        completedAt: completed ? new Date().toISOString() : null,
        knowledgeSummary: kmap ? Object.values(kmap).flat().filter(v => typeof v === "string") : [],
        knowledgeMap: kmap || null,
        ...(savedId ? { _id: savedId } : {}),
      };
      const res  = await fetch(`${BASE_URL}/api/interviews`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.id && !savedId) setSavedId(data.id);
      onSave?.(payload);
    } catch (err) { console.error("Save error:", err); }
  }

  // ── Mic ───────────────────────────────────────────────────────────────────
  function toggleMic() {
    if (isRecording) { recRef.current?.stop(); recRef.current = null; setIsRecording(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-IN";
    let final = "";
    rec.onstart  = () => setIsRecording(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setInputText((final + interim).trim());
    };
    rec.onerror = () => { setIsRecording(false); recRef.current = null; };
    rec.onend   = () => { setIsRecording(false); recRef.current = null; if (final.trim()) setInputText(final.trim()); };
    recRef.current = rec;
    try { rec.start(); } catch { setIsRecording(false); recRef.current = null; }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const answeredCount = entries.filter(e => e.answer !== null).length;
  const pct = Math.min((coreIndex / CORE_Q) * 100 + (finalCount / FINAL_Q) * 10, 100);
  const isDisabled = isThinking || isSpeaking;
  const phaseLabel = () => {
    if (coreIndex >= CORE_Q) return `Final Deep-Dive · ${finalCount}/${FINAL_Q}`;
    if (currentEntry?.type === "followup") return `Follow-up · Core Q${coreIndex + 1} of ${CORE_Q}`;
    return `Core Question ${coreIndex + 1} of ${CORE_Q}`;
  };
  const qBadge = currentEntry?.type === "followup" ? { label: "FOLLOW-UP", col: "#6db86d" } : currentEntry?.type === "final" ? { label: "DEEP-DIVE", col: "#6688cc" } : { label: "QUESTION", col: "#c4922a" };

  const S = {
    mono:  (sz = "10px", col = "#9b7a50") => ({ fontFamily: "'Space Mono',monospace", fontSize: sz, color: col, letterSpacing: "0.06em" }),
    serif: (sz = "16px", col = "#2a1a08") => ({ fontFamily: "'Cormorant Garamond',serif", fontSize: sz, color: col, lineHeight: "1.6" }),
    title: { fontFamily: "'IM Fell DW Pica',serif", fontSize: "clamp(17px,2.5vw,22px)", color: "#2a1a08", lineHeight: "1.5" },
    btn:   (bg, col, bdr) => ({ padding: "10px 20px", borderRadius: "6px", background: bg, border: `1px solid ${bdr}`, color: col, fontFamily: "'IM Fell DW Pica',serif", fontSize: "15px", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }),
  };

  // ═════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═════════════════════════════════════════════════════════════════════════

  if (phase === PHASE.INIT || phase === PHASE.CHECKING || phase === PHASE.LOADING) return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: "32px", marginBottom: "16px" }}>🌿</div>
      <div style={S.title}>{loadingMsg}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
        {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c4922a", animation: `bounce 0.8s ${d}s ease-in-out infinite` }} />)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );

  if (phase === PHASE.PAUSED) return (
    <div style={{ textAlign: "center", padding: "40px 24px" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏸</div>
      <div style={{ ...S.title, fontSize: "20px", marginBottom: "8px" }}>Interview Paused</div>
      <div style={{ ...S.serif("16px", "#5a4a3a"), maxWidth: "360px", margin: "0 auto 20px" }}>
        {greeting || `Your interview on "${topic}" has been paused. Continue anytime.`}
      </div>
      <div style={{ ...S.mono("11px", "#9b7a50"), marginBottom: "20px" }}>{answeredCount} questions answered · {phaseLabel()}</div>
      <button onClick={() => { setPhase(PHASE.ACTIVE); setTimeout(() => { if (currentEntry?.question) speakQuestion(currentEntry.question); }, 300); }}
        style={{ ...S.btn("linear-gradient(135deg,#9b6b2f,#7a4f1f)", "#f4edd6", "#7a4f1f"), fontSize: "16px", padding: "12px 32px" }}>
        Continue Interview
      </button>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );

  // ── DONE: Knowledge Map ───────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    const KV = {
      techniques:           { label: "Techniques Identified",  icon: "⚙️" },
      materials:            { label: "Materials Used",         icon: "🌿" },
      tools:                { label: "Traditional Tools",      icon: "🔧" },
      treatmentProcess:     { label: "Treatment Process",      icon: "📋" },
      healingDuration:      { label: "Healing Duration",       icon: "⏱" },
      safetyPractices:      { label: "Safety Practices",       icon: "🛡" },
      culturalSignificance: { label: "Cultural Significance",  icon: "🏛" },
      limitations:          { label: "Limitations",            icon: "⚠️" },
      transmission:         { label: "Knowledge Transmission", icon: "📜" },
      keyInsights:          { label: "Key Insights",           icon: "💡" },
    };
    return (
      <div style={{ padding: "max(16px,2vw)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
        <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>✦</div>
          <div style={{ ...S.title, fontSize: "22px", color: "#2a5a2a" }}>Interview Complete</div>
          <div style={{ ...S.serif("15px", "#5a7a5a"), marginTop: "6px" }}>Thank you for sharing your knowledge. Your responses have been recorded.</div>
          <div style={{ ...S.mono("11px", "#9b7a50"), marginTop: "6px" }}>{answeredCount} questions answered · Saved ✓</div>
        </div>
        {knowledgeMap && Object.keys(knowledgeMap).length > 0 && (
          <div style={{ background: "rgba(240,255,240,0.6)", border: "1px solid rgba(100,180,100,0.3)", borderRadius: "8px", padding: "16px 20px" }}>
            <div style={{ ...S.mono("11px", "#2a5a2a"), marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.12em" }}>🧠 Knowledge Captured</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: "10px" }}>
              {Object.entries(knowledgeMap).map(([key, val]) => {
                if (!val || (Array.isArray(val) && val.length === 0)) return null;
                const meta = KV[key] || { label: key, icon: "•" };
                const items = Array.isArray(val) ? val : [val];
                return (
                  <div key={key} style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(212,171,99,0.2)", borderRadius: "6px", padding: "12px" }}>
                    <div style={{ ...S.mono("9px", "#9b7a50"), marginBottom: "6px" }}>{meta.icon} {meta.label.toUpperCase()}</div>
                    {items.map((item, i) => <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "3px" }}><span style={{ color: "#c4922a", flexShrink: 0 }}>•</span><span style={S.serif("13px", "#2a1a08")}>{item}</span></div>)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ background: "rgba(255,252,242,0.8)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "8px", padding: "16px 20px" }}>
          <div style={{ ...S.mono("11px", "#7b4c1a"), marginBottom: "14px", textTransform: "uppercase" }}>📝 Interview Transcript</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {entries.filter(e => e.answer).map((e, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${e.type === "core" ? "rgba(212,171,99,0.6)" : e.type === "followup" ? "rgba(109,184,109,0.5)" : "rgba(100,150,220,0.5)"}`, paddingLeft: "12px" }}>
                <span style={S.mono("9px", e.type === "core" ? "#c4922a" : e.type === "followup" ? "#6db86d" : "#6688cc")}>{e.type === "core" ? "CORE" : e.type === "followup" ? "FOLLOW-UP" : "FINAL"}</span>
                <div style={{ ...S.serif("14px", "#5a3a10"), fontWeight: "600", margin: "3px 0" }}>{e.question}</div>
                <div style={S.serif("14px", "#2a1a08")}>{e.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "max(16px,2vw)", display: "flex", flexDirection: "column", gap: "14px" }}>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(208,94,82,0.4)}50%{box-shadow:0 0 0 8px rgba(208,94,82,0)}}`}</style>
      {answeredCount === 0 && greeting && (
        <div style={{ padding: "10px 14px", background: "rgba(212,171,99,0.1)", border: "1px solid rgba(212,171,99,0.25)", borderRadius: "6px", ...S.serif("16px", "#5a3a10") }}>{greeting}</div>
      )}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={S.mono()}>{phaseLabel()}</span>
          <span style={S.mono()}>{answeredCount} answered</span>
        </div>
        <div style={{ height: "4px", background: "rgba(212,171,99,0.2)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c4922a,#d4ab63)", borderRadius: "2px", transition: "width 0.4s ease" }} />
        </div>
      </div>
      {ack && <div style={{ ...S.serif("15px", "#7b5a30"), fontStyle: "italic", padding: "2px 0" }}>{ack}</div>}
      <div style={{ padding: "20px", background: "linear-gradient(135deg,#fdf8ec,#f5edd6)", border: `1px solid ${qBadge.col}44`, borderRadius: "8px", minHeight: "80px" }}>
        {isThinking && !currentEntry?.question ? (
          <div style={{ display: "flex", gap: "5px", justifyContent: "center", padding: "20px 0" }}>
            {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c4922a", animation: `bounce 0.8s ${d}s ease-in-out infinite` }} />)}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <span style={{ ...S.mono("9px", qBadge.col), background: `${qBadge.col}18`, padding: "2px 8px", borderRadius: "3px" }}>
                {isSpeaking ? "🔊 SPEAKING…" : qBadge.label}
              </span>
            </div>
            <div style={S.title}>{currentEntry?.question}</div>
          </>
        )}
      </div>
      {isThinking && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
          <div style={{ display: "flex", gap: "4px" }}>{[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c4922a", animation: `bounce 0.8s ${d}s ease-in-out infinite` }} />)}</div>
          <span style={S.mono("10px", "#9b7a50")}>Analyzing your answer…</span>
        </div>
      )}
      {validMsg && (
        <div style={{ padding: "10px 14px", background: "rgba(255,243,205,0.9)", border: "1px solid rgba(255,193,7,0.4)", borderRadius: "6px", ...S.mono("11px", "#7a5500") }}>⚠️ {validMsg}</div>
      )}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {images.map((url, i) => <img key={i} src={url} alt={`${topic} ${i + 1}`} style={{ width: "72px", height: "54px", objectFit: "cover", borderRadius: "4px", border: "1px solid rgba(212,171,99,0.3)" }} onError={e => { e.target.style.display = "none"; }} />)}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " Odisha traditional")}`} target="_blank" rel="noopener noreferrer"
            style={{ width: "72px", height: "54px", borderRadius: "4px", background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.18)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", gap: "3px" }}>
            <span style={{ fontSize: "18px" }}>▶</span><span style={S.mono("8px", "#c00")}>VIDEOS</span>
          </a>
        </div>
      )}
      <textarea
        placeholder={isDisabled ? (isThinking ? "Analyzing…" : "Please wait…") : "Type your answer here… (Enter to submit, Shift+Enter for new line)"}
        value={inputText} onChange={e => setInputText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isDisabled) { e.preventDefault(); submitAnswer(); } }}
        disabled={isDisabled} rows={3}
        style={{ width: "100%", padding: "12px 16px", border: "1px solid rgba(212,171,99,0.4)", borderRadius: "6px", ...S.serif("16px", "#2a1a08"), background: isDisabled ? "rgba(245,240,230,0.5)" : "rgba(255,252,242,0.95)", resize: "vertical", outline: "none", boxSizing: "border-box", opacity: isDisabled ? 0.7 : 1, cursor: isDisabled ? "not-allowed" : "text" }}
      />
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, ...S.mono("10px", isRecording ? "#d05e52" : isSpeaking ? "#c4922a" : isThinking ? "#9b7a50" : "#6db86d") }}>
          {isRecording ? "🔴 Listening… click to stop" : isSpeaking ? "🔊 Speaking…" : isThinking ? "⏳ Thinking…" : "● Ready"}
        </span>
        <button onClick={toggleMic} disabled={isDisabled && !isRecording}
          style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0, background: isRecording ? "linear-gradient(135deg,#d05e52,#b84a3e)" : "linear-gradient(135deg,#d4ab63,#b89050)", border: isRecording ? "2px solid #8a3028" : "2px solid #7b5c30", color: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? "0 0 0 5px rgba(208,94,82,0.25)" : "0 2px 6px rgba(0,0,0,0.2)", transition: "all 0.2s", animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none" }}>
          {isRecording ? "⏹" : "🎤"}
        </button>
        <button onClick={submitAnswer} disabled={isDisabled || !inputText.trim()}
          style={{ ...S.btn(isDisabled || !inputText.trim() ? "rgba(155,107,47,0.2)" : "linear-gradient(135deg,#9b6b2f,#7a4f1f)", isDisabled || !inputText.trim() ? "#9b7a50" : "#f4edd6", "rgba(155,107,47,0.4)"), cursor: isDisabled || !inputText.trim() ? "not-allowed" : "pointer" }}>
          Submit Answer
        </button>
        <button onClick={pauseInterview}
          style={{ padding: "10px 14px", borderRadius: "6px", background: "rgba(208,94,82,0.08)", border: "1px solid rgba(208,94,82,0.35)", color: "#c0392b", fontFamily: "'Space Mono',monospace", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap" }}>
          ⏸ Pause
        </button>
      </div>
    </div>
  );
}