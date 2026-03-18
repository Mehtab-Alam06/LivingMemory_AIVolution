import { useState, useEffect, useRef } from "react";
import { API } from "../context/AuthContext";

const AI_PROXY = `${API}/ai`;
const sKey = (t) => `lm_sess_${t.replace(/[^a-z0-9]/gi, "_")}`;
const qKey = (t) => `lm_qs_${t.replace(/[^a-z0-9]/gi, "_")}`;
const getToken = () => localStorage.getItem("lm_token");

const ACKS = ["That is very helpful, thank you.", "I appreciate you sharing that.", "That gives me a clearer picture.", "Thank you for explaining so carefully.", "I would like to understand this more deeply."];
let ackIdx = 0; const getAck = (use) => use ? ACKS[ackIdx++ % ACKS.length] : "";

const PHASE = { INIT: "init", CHECKING: "checking", LOADING: "loading", SETUP: "setup", PROMPT: "prompt", PAUSED: "paused", ACTIVE: "active", DONE: "done" };
const CORE_Q = 15, FINAL_Q = 5;
const VAGUE_MARKERS = ["somehow", "you know", "just feels", "right time", "properly", "experience tells", "naturally", "kind of", "sort of", "usually", "normally", "traditionally", "in the right way", "when it is ready", "you can tell", "i can tell"];

const LAYER_LABELS = {
  1: { label: "Story", desc: "Story Trigger", color: "#c4922a", icon: "📖" },
  2: { label: "Senses", desc: "Sensory Probe", color: "#6db86d", icon: "🤲" },
  3: { label: "Failure", desc: "Failure Memory", color: "#d05e52", icon: "⚠️" },
  4: { label: "Teach", desc: "Teaching Moment", color: "#6688cc", icon: "🎓" },
  5: { label: "Why", desc: "Why Behind the Why", color: "#9b6b9b", icon: "🌿" },
};

const DOMAIN_QUESTIONS = (topic, domain) => {
  const d = (domain || "").toLowerCase();
  const isHealth = d.includes("health");
  const isCraft = d.includes("craft") || d.includes("art");
  return {
    1: [
      `Tell me about the most difficult time you ever faced with ${topic}. What happened?`,
      `Tell me about a time when ${topic} did not go as expected. Walk me through what happened.`,
      `What is the piece of work with ${topic} you are most proud of? Tell me that story.`,
      isHealth ? `Tell me about the most serious case you ever treated using ${topic}.` : isCraft ? `Tell me about the time you made something with ${topic} that you considered truly perfect.` : `Tell me about the worst harvest or season you had with ${topic}. What did you learn?`,
      `When did you first realize you truly understood ${topic}? Tell me about that moment.`,
    ],
    2: [
      `When you are working with ${topic}, what does your hand feel? Describe exactly what it tells you.`,
      `What smell or sound tells you that ${topic} is being done correctly?`,
      `What do you see in ${topic} that a beginner would completely miss?`,
      isHealth ? `When you touch or observe a patient, what does your body tell you?` : isCraft ? `Where in your body do you feel the rhythm of this work?` : `What does ${topic} look like or smell like when the timing is exactly right?`,
      `What small sign tells you that ${topic} is ready or working?`,
    ],
    3: [
      `When did ${topic} go completely wrong? What mistake did you make?`,
      `What do young people always get wrong about ${topic}?`,
      `Has ${topic} ever caused harm or failed completely? What happened?`,
      `What is the most dangerous mistake someone could make with ${topic}?`,
      `Tell me about something in ${topic} that almost went very wrong once.`,
    ],
    4: [
      `If your grandchild stood next to you right now learning ${topic}, what would you make sure they watched for?`,
      `What part of ${topic} would you never let a beginner do alone? Why?`,
      `What takes ten years to truly understand about ${topic}?`,
      `What would you tell someone on their very first day learning ${topic}?`,
      `If you could only teach one lesson about ${topic}, what would it be?`,
    ],
    5: [
      `Why is ${topic} done this particular way and not another?`,
      `Who taught you ${topic}? What is the most important thing THEY told you?`,
      `Is there a right time, right season, or right moment for ${topic}?`,
      `What would your grandmother say if they saw ${topic} done differently today?`,
      `What would be lost forever if ${topic} disappeared?`,
    ],
  };
};

const FLAT_POOL = (topic, domain) => Object.entries(DOMAIN_QUESTIONS(topic, domain)).flatMap(([layer, qs]) => qs.map(q => ({ q, layer: parseInt(layer) })));

async function callAI(system, user, maxTokens = 800) {
  const body = { max_tokens: maxTokens, messages: [{ role: "user", content: user }] };
  if (system) body.system = system;
  const res = await fetch(AI_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
}

export default function AIInterview({ topic, domain, userName, onSave }) {
  const [phase, setPhase] = useState(PHASE.INIT);
  const [coreQuestions, setCoreQuestions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [validMsg, setValidMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("Checking your session…");
  const [savedId, setSavedId] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [coreIndex, setCoreIndex] = useState(0);
  const [followupCount, setFollowupCount] = useState(0);
  const [finalCount, setFinalCount] = useState(0);
  const [knowledgeMap, setKnowledgeMap] = useState(null);
  const [ack, setAck] = useState("");
  const [layerCoverage, setLayerCoverage] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [existingSession, setExistingSession] = useState(null);
  const [language, setLanguage] = useState("English");
  
  // Custom Prompt State
  const [initialPromptReady, setInitialPromptReady] = useState(false);
  const [initialContext, setInitialContext] = useState("");

  const recRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    checkSession();
    return () => { window.speechSynthesis?.cancel(); recRef.current?.stop(); };
  }, []);

  function speak(text, onEnd) {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    
    // Windows/Chrome generally do not ship with an Odia synthesizer.
    // If we try to queue Odia text, it silently fails and the queue hangs permanently.
    if (language === "Odia") {
      console.log("TTS bypassed for Odia due to lack of browser native synthesizer voices.");
      onEnd?.();
      return;
    }

    const langLocale = language === "Hindi" ? "hi-IN" : "en-IN";
    try {
      window.speechSynthesis.cancel();
      const raw = text.trim();
      const chunks = raw.match(/[^.!?\u0964\u0B30]+[.!?\u0964\u0B30]*/g) || [raw];
      const cleaned = chunks.map(c => c.trim()).filter(c => c.length > 0);
      if (cleaned.length === 0) { onEnd?.(); return; }
      let idx = 0, cancelled = false;
      const keepAlive = setInterval(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 10000);
      function speakChunk() {
        if (cancelled || idx >= cleaned.length) { clearInterval(keepAlive); onEnd?.(); return; }
        const u = new SpeechSynthesisUtterance(cleaned[idx]);
        u.rate = 0.88; u.pitch = 1.0; u.lang = langLocale;
        u.onend = () => { idx++; speakChunk(); };
        u.onerror = (e) => { if (e.error === "interrupted") { clearInterval(keepAlive); return; } idx++; speakChunk(); };
        window.speechSynthesis.speak(u);
      }
      speakChunk();
      return () => { cancelled = true; clearInterval(keepAlive); window.speechSynthesis.cancel(); };
    } catch { onEnd?.(); }
  }

  useEffect(() => {
    if (phase === PHASE.ACTIVE || phase === PHASE.PAUSED) {
      sessionStorage.setItem(sKey(topic), JSON.stringify({ coreIndex, followupCount, finalCount, entries, phase, layerCoverage }));
      if (coreQuestions.length) sessionStorage.setItem(qKey(topic), JSON.stringify(coreQuestions));
    }
  }, [coreIndex, followupCount, finalCount, entries, phase, layerCoverage]);

  async function checkSession() {
    setPhase(PHASE.CHECKING);
    const ss = sessionStorage.getItem(sKey(topic));
    const sq = sessionStorage.getItem(qKey(topic));
    if (ss && sq) {
      try {
        const sessionData = JSON.parse(ss);
        const qs = JSON.parse(sq);
        if (qs.length > 0 && sessionData.entries?.length > 0) {
          setExistingSession({ ...sessionData, questions: qs });
          setPhase(PHASE.SETUP);
          return;
        }
      } catch {}
    }
    const token = getToken();
    if (token) {
      try {
        const res = await fetch(`${API}/interviews/resume?topic=${encodeURIComponent(topic)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data?.questions?.length > 0 && data.entries?.length > 0) {
            setExistingSession(data);
            setPhase(PHASE.SETUP);
            return;
          }
        }
      } catch {}
    }
    setPhase(PHASE.SETUP);
  }

  function startNewInterview() {
    sessionStorage.removeItem(sKey(topic));
    sessionStorage.removeItem(qKey(topic));
    setExistingSession(null);
    setEntries([]); setCoreIndex(0); setFollowupCount(0); setFinalCount(0);
    setLayerCoverage({ 1: false, 2: false, 3: false, 4: false, 5: false });
    
    // Instead of directly generating questions, ask for initial prompt first.
    setPhase(PHASE.PROMPT);
    const promptGreeting = language === "English" 
      ? `Namaskar ${userName || ""}. Before we begin the interview, could you tell me a little bit about your experience with ${topic} and how it is practiced in your community?`
      : language === "Hindi"
      ? `Namaskar ${userName || ""}. शुरू करने से पहले, क्या आप मुझे ${topic} के साथ अपने अनुभव और आपके समुदाय में इसका अभ्यास कैसे किया जाता है, इसके बारे में कुछ बता सकते हैं?`
      : `Namaskar ${userName || ""}. ଆରମ୍ଭ କରିବା ପୂର୍ବରୁ, ଦୟାକରି ଆପଣଙ୍କର ${topic} ବିଷୟରେ ଅଭିଜ୍ଞତା ଏବଂ ଆପଣଙ୍କ ସମ୍ପ୍ରଦାୟରେ ଏହା କିପରି ଅଭ୍ୟାସ କରାଯାଏ ସେ ବିଷୟରେ କିଛି କହିପାରିବେ କି?`;
    
    setGreeting(promptGreeting);
    setIsSpeaking(true);
    speak(promptGreeting, () => setIsSpeaking(false));
  }

  function resumeExistingInterview() {
    if (!existingSession) return;
    const { questions, entries: ent, phase: ph, layerCoverage: lc, _id } = existingSession;
    const ci = existingSession.coreIndex ?? existingSession.currentQuestionIndex ?? 0;
    const fc = existingSession.followupCount ?? 0;
    const fnc = existingSession.finalCount ?? 0;
    setCoreQuestions(questions || []); setEntries(ent || []);
    setCoreIndex(ci); setFollowupCount(fc); setFinalCount(fnc);
    if (lc) setLayerCoverage(lc);
    if (_id) setSavedId(_id);
    setCurrentEntry(ent?.find(e => e.answer === null) || null);
    setGreeting(`Namaskar ${userName || ""}. Welcome back. Continuing your interview on "${topic}".`);
    if (ph === PHASE.DONE || existingSession.completed) setPhase(PHASE.DONE);
    else setPhase(PHASE.PAUSED);
  }

  // Generate Questions tailored to the initial context
  async function generateContextualQuestions(contextStr) {
    setPhase(PHASE.LOADING);
    setLoadingMsg("Crafting personalised interview questions based on your context…");
    try {
      let pool = FLAT_POOL(topic, domain);
      const poolText = pool.map((p, i) => `${i + 1}. [Layer ${p.layer}] ${p.q}`).join("\n");
      const gapInstruction = contextStr 
        ? `The user provided this initial context about their practice: "${contextStr.substring(0, 1000)}".
           Ensure the 15 selected questions are highly tailored to this exact specific context and seamlessly follow up on what they just shared. Ensure all 5 layers are represented.`
        : `First interview. Ensure all 5 layers are represented.`;

      const raw = await callAI(
        `You are documenting traditional knowledge of Odisha for "${topic}".
         Select and REPHRASE exactly 15 questions from the provided pool.
         STRICT INSTRUCTION: YOU MUST RESPOND ONLY IN ${language}. Use the native script for ${language}. DO NOT output English unless ${language} is English.
         Include at least 2 questions from each layer. Max 30 words each. No yes/no.
         ${gapInstruction}
         Return ONLY a valid JSON array of objects: [{"q":"question in native script","layer":1},...]`,
        `Topic: "${topic}", Domain: ${domain}, Language: ${language}\nPool:\n${poolText}\nReturn 15 tailored questions as JSON array:`, 2500
      );
      
      let parsed = [];
      try { parsed = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || "[]"); } catch {}
      if (!Array.isArray(parsed) || parsed.length < 12) parsed = [...pool].sort(() => Math.random() - 0.5).slice(0, 15);
      parsed = parsed.slice(0, 15);
      
      const qs = parsed.map(p => (typeof p === "string" ? p : p.q));
      const layers = parsed.map(p => (typeof p === "object" ? (p.layer || 1) : 1));
      
      setCoreQuestions(qs);
      sessionStorage.setItem(qKey(topic), JSON.stringify(qs));
      
      const firstEntry = { type: "core", question: qs[0], answer: null, parentIndex: null, layer: layers[0] };
      setEntries([firstEntry]); setCurrentEntry(firstEntry);
      setCoreIndex(0); setFollowupCount(0); setFinalCount(0);
      
      const greet = language === "English" ? "Thank you for that context. Let us begin the questions." : language === "Hindi" ? "इस संदर्भ के लिए धन्यवाद। आइए प्रश्न शुरू करें।" : "ସୂଚନା ପାଇଁ ଧନ୍ୟବାଦ। ଆସନ୍ତୁ ପ୍ରଶ୍ନ ଆରମ୍ଭ କରିବା।";
      setGreeting(greet); setPhase(PHASE.ACTIVE);
      
      const speakQ0 = () => {
        const q0 = qs[0]; if (!q0) return;
        setIsSpeaking(true); let done = false;
        const onDone = () => { if (!done) { done = true; setIsSpeaking(false); } };
        speak(q0, onDone); setTimeout(onDone, Math.max(q0.length * 120, 8000));
      };
      let greetDone = false;
      const afterGreet = () => { if (greetDone) return; greetDone = true; speakQ0(); };
      speak(greet, afterGreet); setTimeout(afterGreet, Math.max(greet.length * 120, 8000));
    } catch (err) { console.error("Init QA error:", err); setLoadingMsg("Connection error. Please refresh and try again."); }
  }

  function submitInitialPrompt() {
    const ctx = inputText.trim();
    if (!ctx) { setValidMsg("Please provide some initial thoughts to begin."); return; }
    setInitialContext(ctx);
    setInputText("");
    setValidMsg("");
    window.speechSynthesis?.cancel(); recRef.current?.stop(); setIsRecording(false); setIsSpeaking(false);
    generateContextualQuestions(ctx);
  }

  function detectVagueWord(answer) {
    const lower = answer.toLowerCase();
    return VAGUE_MARKERS.find(v => lower.includes(v)) || null;
  }

  async function analyzeAndDecideNext(answer, entrySnapshot, coreIdx, fpCount, fnCount, allEntries, currentLayer) {
    setIsThinking(true);
    const answeredEntries = allEntries.filter(e => e.answer !== null);
    const histStr = answeredEntries.map(e => `[L${e.layer || "?"}] Q: ${e.question}\nA: ${e.answer}`).join("\n\n");
    const isFinalPhase = coreIdx >= CORE_Q;

    if (isFinalPhase) {
      if (fnCount >= FINAL_Q) { setIsThinking(false); await endInterview(allEntries); return; }
      const missingLayers = [1,2,3,4,5].filter(l => !layerCoverage[l]);
      const finalQ = await callAI(
        `Completing interview regarding "${topic}".\nUncovered layers: ${missingLayers.length > 0 ? missingLayers.join(", ") : "all covered"}.\nSTRICT INSTRUCTION: YOU MUST RESPOND ONLY IN ${language}. Use the native script for ${language}. DO NOT output English unless ${language} is English.\nAsk ONE final question. Max 30 words. No yes/no.`,
        `Topic: "${topic}", Language: ${language}\nInterview:\n${histStr.substring(0, 1000)}\nFinal question ${fnCount + 1} of ${FINAL_Q}:`
      );
      const q = finalQ?.trim() || `What is the one thing about ${topic} that you have never been asked before?`;
      const newEntry = { type: "final", question: q, answer: null, parentIndex: null, layer: missingLayers[0] || 5 };
      setEntries(prev => [...prev, newEntry]); setCurrentEntry(newEntry);
      setFinalCount(fnCount + 1); setAck(""); setIsThinking(false); speakQuestion(q);
      return;
    }

    if (answer && fpCount < 2) {
      const vagueWord = detectVagueWord(answer);
      if (vagueWord) {
        const vagueQ = await callAI(
          `Probing tacit knowledge about "${topic}". Elder used vague phrase. Ask what it means.\nSTRICT INSTRUCTION: YOU MUST RESPOND ONLY IN ${language}. Use the native script for ${language}. DO NOT output English unless ${language} is English. Max 30 words.`,
          `Answer: "${answer}"\nVague phrase: "${vagueWord}"\nLanguage: ${language}\nGenerate probing question:`
        );
        const q = vagueQ?.trim() || `You said "${vagueWord}" — can you describe exactly what that means?`;
        const newEntry = { type: "followup", question: q, answer: null, parentIndex: coreIdx, layer: 2 };
        setEntries(prev => [...prev, newEntry]); setCurrentEntry(newEntry);
        setFollowupCount(fpCount + 1);
        setAck(getAck(answeredEntries.length % 4 === 0 && answeredEntries.length > 0));
        setIsThinking(false); speakQuestion(q, ack); return;
      }
    }

    if (fpCount < 2 && answer.trim().split(/\s+/).length >= 10) {
      const lowestMissing = [1,2,3,4,5].find(l => !layerCoverage[l]) || 2;
      const decision = await callAI(
        `Documenting "${topic}". Current layer: ${currentLayer}. Next priority: ${lowestMissing}.\nSTRICT INSTRUCTION: YOU MUST RESPOND ONLY IN ${language}. Use the native script for ${language}. DO NOT output English unless ${language} is English.\nReturn ONLY JSON: {"decision":"FOLLOWUP"|"NEXT","question":"...","layer":${lowestMissing}}`,
        `Topic: "${topic}", Language: ${language}\nQ: "${entrySnapshot.question}"\nA: "${answer}"\nHistory:\n${histStr.substring(0, 700)}`
      );
      try {
        const parsed = JSON.parse(decision.match(/\{[\s\S]*?\}/)?.[0] || "{}");
        if (parsed.decision === "FOLLOWUP" || parsed.decision === "CLARIFY") {
          const followUpQ = parsed.question || "Could you describe that step in more detail?";
          const followLayer = parsed.layer || lowestMissing;
          const newEntry = { type: "followup", question: followUpQ, answer: null, parentIndex: coreIdx, layer: followLayer };
          setEntries(prev => [...prev, newEntry]); setCurrentEntry(newEntry);
          setFollowupCount(fpCount + 1);
          setLayerCoverage(prev => ({ ...prev, [followLayer]: true }));
          const ackText = getAck(answeredEntries.length % 4 === 0 && answeredEntries.length > 0);
          setAck(ackText); setIsThinking(false); speakQuestion(followUpQ, ackText); return;
        }
      } catch {}
    }

    const nextCoreIdx = coreIdx + 1;
    if (nextCoreIdx >= CORE_Q) {
      setCoreIndex(nextCoreIdx); setFollowupCount(0); setIsThinking(false);
      await analyzeAndDecideNext("", { type: "transition" }, nextCoreIdx, 0, fnCount, allEntries, 5);
      return;
    }
    const nextQ = coreQuestions[nextCoreIdx];
    const poolEntry = FLAT_POOL(topic, domain).find(p => p.q === nextQ);
    const nextLayer = poolEntry?.layer || 1;
    const newEntry = { type: "core", question: nextQ, answer: null, parentIndex: null, layer: nextLayer };
    setEntries(prev => [...prev, newEntry]); setCurrentEntry(newEntry);
    setCoreIndex(nextCoreIdx); setFollowupCount(0);
    if (currentLayer) setLayerCoverage(prev => ({ ...prev, [currentLayer]: true }));
    const ackText = getAck(answeredEntries.length % 4 === 0 && answeredEntries.length > 0);
    setAck(ackText); setIsThinking(false); speakQuestion(nextQ, ackText);
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

  async function validate(answer) {
    const trivial = ["yes", "no", "ok", "okay", "sure", "idk", "fine", "yeah", "nah", "hmm", "uh", "um", "i don't know", "dont know", "maybe", "nothing"];
    const t = answer.trim().toLowerCase();
    if (t.length < 8 || trivial.includes(t) || answer.trim().split(/\s+/).length < 3) return false;
    try {
      const r = await callAI("Reply with ONLY: RELEVANT or NOT_RELEVANT. The answer may be in Odia, Hindi, or English - analyze appropriately.", `Topic: "${topic}"\nQuestion: "${currentEntry?.question}"\nAnswer: "${answer}"\nRelevant?`);
      return r.trim().toUpperCase().includes("RELEVANT");
    } catch { return true; }
  }

  async function submitAnswer() {
    const answer = inputText.trim();
    if (!answer || isThinking || isSpeaking || !currentEntry) return;
    setIsThinking(true); setValidMsg("");
    const ok = await validate(answer);
    if (!ok) { setValidMsg(`Please share something about ${topic} itself.`); setIsThinking(false); return; }
    const updatedEntries = entries.map(e => e === currentEntry ? { ...e, answer } : e);
    setEntries(updatedEntries); setInputText(""); setValidMsg(""); setAck("");
    const layer = currentEntry.layer || 1;
    const newCoverage = { ...layerCoverage, [layer]: true };
    setLayerCoverage(newCoverage);
    await saveProgress(updatedEntries, coreIndex, followupCount, finalCount, false, null, newCoverage);
    await analyzeAndDecideNext(answer, currentEntry, coreIndex, followupCount, finalCount, updatedEntries, layer);
  }

  async function extractKnowledgeMap(allEntries) {
    const answered = allEntries.filter(e => e.answer);
    const qa = answered.map(e => `[Layer ${e.layer || "?"}] Q: ${e.question}\nA: ${e.answer}`).join("\n\n");
    try {
      const result = await callAI(
        `Extract structured knowledge from interview about "${topic}" from Odisha.\nReturn ONLY JSON: {"techniques":[],"materials":[],"tools":[],"treatmentProcess":[],"healingDuration":"","safetyPractices":[],"culturalSignificance":"","limitations":[],"transmission":"","keyInsights":[]}`,
        `Interview:\n${qa.substring(0, 2000)}`
      );
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || "{}");
    } catch { return {}; }
  }

  async function endInterview(allEntries) {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); setIsRecording(false);
    const kmap = await extractKnowledgeMap(allEntries || entries);
    setKnowledgeMap(kmap); setPhase(PHASE.DONE);
    sessionStorage.removeItem(sKey(topic)); sessionStorage.removeItem(qKey(topic));
    await saveProgress(allEntries || entries, coreIndex, followupCount, finalCount, true, kmap, layerCoverage);
  }

  async function pauseInterview() {
    window.speechSynthesis?.cancel(); recRef.current?.stop(); setIsRecording(false);
    setPhase(PHASE.PAUSED);
    await saveProgress(entries, coreIndex, followupCount, finalCount, false, null, layerCoverage);
  }

  async function saveProgress(ents, ci, fc, fnc, completed, kmap, lc) {
    try {
      const token = getToken();
      const answered = (ents || entries).filter(e => e.answer);
      const finalLc = lc || layerCoverage;
      const score = Math.round((Object.values(finalLc).filter(Boolean).length / 5) * 100);
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
        layerCoverage: finalLc, completenessScore: score,
        followUpNeeded: score < 80,
        ...(savedId ? { _id: savedId } : {}),
      };
      const res = await fetch(`${API}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id && !savedId) setSavedId(data.id);
      onSave?.(payload);
    } catch (err) { console.error("Save error:", err); }
  }

  function toggleMic() {
    if (isRecording) { recRef.current?.stop(); recRef.current = null; setIsRecording(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true;
    rec.lang = language === "Odia" ? "or-IN" : language === "Hindi" ? "hi-IN" : "en-IN";
    let final = "";
    rec.onstart = () => setIsRecording(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setInputText((final + interim).trim());
    };
    rec.onerror = () => { setIsRecording(false); recRef.current = null; };
    rec.onend = () => { setIsRecording(false); recRef.current = null; if (final.trim()) setInputText(final.trim()); };
    recRef.current = rec;
    try { rec.start(); } catch { setIsRecording(false); recRef.current = null; }
  }

  // Derived variables
  const answeredCount = entries.filter(e => e.answer !== null).length;
  const pct = Math.min((coreIndex / CORE_Q) * 100 + (finalCount / FINAL_Q) * 10, 100);
  const isDisabled = isThinking || isSpeaking;
  const phaseLabel = () => {
    if (coreIndex >= CORE_Q) return `Final Deep-Dive · ${finalCount}/${FINAL_Q}`;
    if (currentEntry?.type === "followup") return `Follow-up · Core Q${coreIndex + 1} of ${CORE_Q}`;
    return `Core Question ${coreIndex + 1} of ${CORE_Q}`;
  };
  const qBadge = currentEntry?.type === "followup" ? { label: "FOLLOW-UP", col: "#6db86d" } : currentEntry?.type === "final" ? { label: "DEEP-DIVE", col: "#6688cc" } : { label: "QUESTION", col: "#c4922a" };
  const currentLayer = currentEntry?.layer || null;

  const S = {
    mono: (sz = "10px", col = "#9b7a50") => ({ fontFamily: "'Space Mono',monospace", fontSize: sz, color: col, letterSpacing: "0.06em" }),
    serif: (sz = "16px", col = "#2a1a08") => ({ fontFamily: "'Cormorant Garamond',serif", fontSize: sz, color: col, lineHeight: "1.6" }),
    title: { fontFamily: "'IM Fell DW Pica',serif", fontSize: "clamp(17px,2.5vw,22px)", color: "#2a1a08", lineHeight: "1.5" },
    btn: (bg, col, bdr) => ({ padding: "10px 20px", borderRadius: "6px", background: bg, border: `1px solid ${bdr}`, color: col, fontFamily: "'IM Fell DW Pica',serif", fontSize: "15px", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }),
  };

  // UI Scaling Wrapper
  const wrapperStyle = { height: "100%", overflowY: "auto", boxSizing: "border-box", display: "flex", flexDirection: "column" };

  if (phase === PHASE.INIT || phase === PHASE.CHECKING || phase === PHASE.LOADING) return (
    <div style={{ ...wrapperStyle, alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: "32px", marginBottom: "16px" }}>🌿</div>
      <div style={{ ...S.title, textAlign: "center" }}>{loadingMsg}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
        {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c4922a", animation: `bounce 0.8s ${d}s ease-in-out infinite` }} />)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );

  if (phase === PHASE.SETUP) return (
    <div style={{ ...wrapperStyle, padding: "30px 24px", alignItems: "center", gap: "24px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px", filter: "drop-shadow(0 0 12px rgba(212,171,99,0.3))" }}>📜</div>
        <div style={{ ...S.mono("11px", "#c4922a"), textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>Interview Setup</div>
        <h2 style={{ ...S.title, fontSize: "28px", maxWidth: "500px", margin: "0 auto" }}>Knowledge Preservation: {topic}</h2>
        <div style={{ height: "2px", width: "80px", background: "linear-gradient(90deg, transparent, #c4922a, transparent)", margin: "16px 0" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", background: "rgba(212,171,99,0.08)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(212,171,99,0.15)" }}>
        <div style={S.mono("10px", "#c4922a")}>CHOOSE INTERVIEW LANGUAGE</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          {["English", "Odia", "Hindi"].map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              style={{ padding: "8px 20px", borderRadius: "30px", background: language === lang ? "linear-gradient(135deg,#9b6b2f,#7a4f1f)" : "transparent", border: `1px solid ${language === lang ? "#9b6b2f" : "rgba(212,171,99,0.3)"}`, color: language === lang ? "#f4edd6" : "#9b7a50", fontFamily: "'IM Fell DW Pica',serif", fontSize: "15px", cursor: "pointer", transition: "all 0.3s", boxShadow: language === lang ? "0 4px 10px rgba(122,79,31,0.3)" : "none" }}>
              {lang === "English" ? "English" : lang === "Odia" ? "ଓଡ଼ିଆ" : "हिंदी"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyItems: "stretch", width: "100%", maxWidth: "600px" }}>
        {existingSession && (
          <div style={{ flex: 1, minWidth: "260px", padding: "20px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(212,171,99,0.2)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer" }} onClick={resumeExistingInterview}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={S.mono("10px", "#c4922a")}>PAUSED SESSION</div>
              <div style={{ background: "#6db86d22", color: "#2a5a2a", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>{Math.round(((existingSession.currentQuestionIndex || existingSession.coreIndex || 0) / CORE_Q) * 100)}% DONE</div>
            </div>
            <div style={{ ...S.serif("18px", "#2a1a08"), fontWeight: "bold" }}>Resume Conversation</div>
            <button style={{ ...S.btn("linear-gradient(135deg,#6db86d,#4a8c4a)", "#fff", "#4a8c4a"), width: "100%", marginTop: "auto" }}>Continue</button>
          </div>
        )}
        <div style={{ flex: 1, minWidth: "260px", padding: "20px", background: "rgba(212,171,99,0.05)", border: "2px dashed rgba(212,171,99,0.2)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", cursor: "pointer" }} onClick={startNewInterview}>
          <div style={S.mono("10px", "#c4922a")}>NEW SESSION</div>
          <div style={{ ...S.serif("18px", "#2a1a08"), fontWeight: "bold" }}>Start Fresh Interview</div>
          <div style={S.mono("11px", "#8b7a60")}>Context-driven AI interview.</div>
          <button style={{ ...S.btn("transparent", "#9b6b2f", "#9b6b2f"), width: "100%", marginTop: "auto" }}>Initialize AI</button>
        </div>
      </div>
    </div>
  );

  // INITIAL PROMPT PHASE
  if (phase === PHASE.PROMPT) {
    return (
      <div style={{ ...wrapperStyle, padding: "clamp(12px, 3vh, 32px)", justifyContent: "center" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "auto" }}>
          <button onClick={() => setPhase(PHASE.INIT)} style={{ background: "none", border: "none", color: "#c4922a", fontSize: "12px", fontFamily: "Space Mono", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            ← Back
          </button>
        </div>

        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
          <div style={{ ...S.mono("13px", "#c4922a"), marginBottom: "16px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {language === "English" ? "Initial Context" : language === "Hindi" ? "प्रारंभिक संदर्भ" : "ପ୍ରାରମ୍ଭିକ ସୂଚନା"}
          </div>
          
          <div style={{ ...S.title, fontSize: "clamp(22px, 4vw, 32px)", lineHeight: "1.4", marginBottom: "32px", borderBottom: "1px solid rgba(212,171,99,0.3)", paddingBottom: "24px" }}>
            {greeting}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <button onClick={toggleMic} disabled={isSpeaking && !isRecording}
                style={{ width: "90px", height: "90px", borderRadius: "50%", background: isRecording ? "linear-gradient(135deg,#d05e52,#b84a3e)" : "linear-gradient(135deg,#d4ab63,#b89050)", border: isRecording ? "4px solid #8a3028" : "4px solid #7b5c30", color: "#fff", fontSize: "36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? "0 0 0 10px rgba(208,94,82,0.3)" : "0 6px 16px rgba(0,0,0,0.3)", transition: "all 0.3s", transform: isRecording ? "scale(1.1)" : "scale(1)" }}>
                {isRecording ? "⏹" : "🎤"}
              </button>
              <span style={{ ...S.mono("12px", isRecording ? "#d05e52" : "#c4922a"), fontWeight: "bold", textTransform: "uppercase" }}>
                {isRecording ? (language === "English" ? "Stop Listening" : language === "Hindi" ? "सुनना बंद करें" : "ଶୁଣିବା ବନ୍ଦ କରନ୍ତୁ") : (language === "English" ? "Tap to Speak" : language === "Hindi" ? "बोलने के लिए टैप करें" : "କହିବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ")}
              </span>
            </div>

            <textarea
              placeholder={language === "English" ? "Or type your initial thoughts here..." : language === "Hindi" ? "या अपने प्रारंभिक विचार यहाँ टाइप करें..." : "କିମ୍ବା ଆପଣଙ୍କର ପ୍ରାରମ୍ଭିକ ବିଚାର ଏଠାରେ ଟାଇପ୍ କରନ୍ତୁ..."}
              value={inputText} onChange={e => setInputText(e.target.value)}
              disabled={isSpeaking} rows={4}
              style={{ width: "100%", padding: "16px", border: "1px solid rgba(212,171,99,0.5)", borderRadius: "8px", ...S.serif("18px", "#2a1a08"), background: "rgba(255,252,242,0.9)", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
            <div style={{ ...S.mono("11px", "#d05e52"), opacity: validMsg ? 1 : 0, transition: "opacity 0.3s" }}>{validMsg || "Placeholder"}</div>
            
            <button onClick={submitInitialPrompt} disabled={isSpeaking || !inputText.trim()}
              style={{ ...S.btn(isSpeaking || !inputText.trim() ? "rgba(155,107,47,0.2)" : "linear-gradient(135deg,#9b6b2f,#7a4f1f)", isSpeaking || !inputText.trim() ? "#9b7a50" : "#f4edd6", "rgba(155,107,47,0.4)"), padding: "12px 32px", fontSize: "13px" }}>
              {language === "English" ? "Begin Interview" : language === "Hindi" ? "साक्षात्कार शुरू करें" : "ସାକ୍ଷାତକାର ଆରମ୍ଭ କରନ୍ତୁ"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === PHASE.DONE) {
    const KV = { techniques: { label: "Techniques", icon: "⚙️" }, materials: { label: "Materials", icon: "🌿" }, tools: { label: "Tools", icon: "🔧" } };
    const coveredCount = Object.values(layerCoverage).filter(Boolean).length;
    const completenessScore = Math.round((coveredCount / 5) * 100);
    return (
      <div style={{ ...wrapperStyle, padding: "clamp(12px, 3vh, 32px)", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: "4px" }}>
          <button onClick={() => setPhase(PHASE.SETUP)} style={{ background: "none", border: "none", color: "#c4922a", fontSize: "12px", fontFamily: "Space Mono", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
            ← Back
          </button>
        </div>
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>✦</div>
          <div style={{ ...S.title, fontSize: "22px", color: "#2a5a2a" }}>Interview Complete</div>
          <div style={{ ...S.mono("11px", "#9b7a50"), marginTop: "6px" }}>{answeredCount} questions answered · Saved ✓</div>
        </div>
        <div style={{ background: "rgba(255,252,242,0.8)", border: "1px solid rgba(212,171,99,0.3)", borderRadius: "8px", padding: "14px 18px" }}>
          <div style={{ ...S.mono("10px", "#7b4c1a"), marginBottom: "10px", textTransform: "uppercase" }}>🔬 Knowledge Depth — {completenessScore}%</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[1,2,3,4,5].map(l => (
              <div key={l} style={{ flex: 1, minWidth: "60px", textAlign: "center", padding: "8px 6px", background: layerCoverage[l] ? `${LAYER_LABELS[l].color}14` : "rgba(200,200,200,0.08)", border: `1px solid ${layerCoverage[l] ? LAYER_LABELS[l].color : "rgba(200,200,200,0.2)"}44`, borderRadius: "6px" }}>
                <div style={{ fontSize: "16px", opacity: layerCoverage[l] ? 1 : 0.3 }}>{LAYER_LABELS[l].icon}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE INTERVIEW
  return (
    <div style={{ ...wrapperStyle, padding: "max(14px,2vw)", gap: "10px" }}>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(208,94,82,0.4)}50%{box-shadow:0 0 0 8px rgba(208,94,82,0)}}`}</style>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "4px" }}>
        <button onClick={() => setPhase(PHASE.SETUP)} style={{ background: "none", border: "none", color: "#c4922a", fontSize: "12px", fontFamily: "Space Mono", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
          ← Back
        </button>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={S.mono()}>{phaseLabel()}</span>
          <span style={S.mono()}>{answeredCount} answered</span>
        </div>
        <div style={{ height: "4px", background: "rgba(212,171,99,0.2)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c4922a,#d4ab63)", borderRadius: "2px", transition: "width 0.4s ease" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1,2,3,4,5].map(l => {
          const covered = layerCoverage[l]; const isCurrent = currentLayer === l;
          return (<div key={l} style={{ flex: 1, height: "6px", background: isCurrent ? `${LAYER_LABELS[l].color}` : covered ? `${LAYER_LABELS[l].color}55` : "rgba(212,171,99,0.15)", borderRadius: "3px" }} />);
        })}
      </div>
      
      <div style={{ padding: "16px", background: "linear-gradient(135deg,#fdf8ec,#f5edd6)", border: `1px solid ${qBadge.col}44`, borderRadius: "8px", flexShrink: 0 }}>
        {isThinking && !currentEntry?.question ? (
          <div style={{ display: "flex", gap: "5px", justifyContent: "center", padding: "10px 0" }}>
            {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#c4922a", animation: `bounce 0.8s ${d}s ease-in-out infinite` }} />)}
          </div>
        ) : (<>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
            <span style={{ ...S.mono("9px", qBadge.col), background: `${qBadge.col}18`, padding: "2px 8px", borderRadius: "3px" }}>{isSpeaking ? "🔊 SPEAKING…" : qBadge.label}</span>
          </div>
          <div style={{ ...S.title, fontSize: "clamp(15px,2vw,19px)" }}>{currentEntry?.question}</div>
        </>)}
      </div>

      <div style={{ flex: 1, minHeight: "0", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <button onClick={toggleMic} disabled={isDisabled && !isRecording}
            style={{ width: "80px", height: "80px", borderRadius: "50%", background: isRecording ? "linear-gradient(135deg,#d05e52,#b84a3e)" : "linear-gradient(135deg,#d4ab63,#b89050)", border: isRecording ? "3px solid #8a3028" : "3px solid #7b5c30", color: "#fff", fontSize: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? "0 0 0 8px rgba(208,94,82,0.3)" : "0 4px 12px rgba(0,0,0,0.3)", transition: "all 0.3s", transform: isRecording ? "scale(1.1)" : "scale(1)", animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none" }}>
            {isRecording ? "⏹" : "🎤"}
          </button>
          <span style={{ ...S.mono("11px", isRecording ? "#d05e52" : "#c4922a"), fontWeight: "bold", textTransform: "uppercase" }}>
            {isRecording ? "Stop Listening" : "Tap to Speak"}
          </span>
        </div>
        <textarea
          placeholder={isDisabled ? (isThinking ? "Analyzing…" : "Please wait…") : "Type your answer here…"}
          value={inputText} onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isDisabled) { e.preventDefault(); submitAnswer(); } }}
          disabled={isDisabled} rows={3}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(212,171,99,0.4)", borderRadius: "6px", ...S.serif("15px", "#2a1a08"), background: isDisabled ? "rgba(245,240,230,0.5)" : "rgba(255,252,242,0.95)", resize: "none", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isRecording ? "#d05e52" : isSpeaking ? "#c4922a" : isThinking ? "#9b7a50" : "#6db86d" }} />
          <span style={{ ...S.mono("9px", isRecording ? "#d05e52" : isSpeaking ? "#c4922a" : isThinking ? "#9b7a50" : "#6db86d") }}>
            {isRecording ? "LISTENING" : isSpeaking ? "SPEAKING" : isThinking ? "THINKING" : "READY"}
          </span>
        </div>
        <button onClick={submitAnswer} disabled={isDisabled || !inputText.trim()}
          style={{ ...S.btn(isDisabled || !inputText.trim() ? "rgba(155,107,47,0.2)" : "linear-gradient(135deg,#9b6b2f,#7a4f1f)", isDisabled || !inputText.trim() ? "#9b7a50" : "#f4edd6", "rgba(155,107,47,0.4)"), cursor: isDisabled || !inputText.trim() ? "not-allowed" : "pointer", padding: "8px 24px" }}>
          Submit
        </button>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={pauseInterview}
            style={{ padding: "8px 12px", borderRadius: "6px", background: "rgba(196,146,42,0.08)", border: "1px solid rgba(196,146,42,0.35)", color: "#9b6b2f", fontFamily: "'Space Mono',monospace", fontSize: "10px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px" }}>
            ⏸ Pause
          </button>
          <button onClick={() => endInterview(entries)}
            style={{ padding: "8px 12px", borderRadius: "6px", background: "rgba(208,94,82,0.08)", border: "1px solid rgba(208,94,82,0.35)", color: "#c0392b", fontFamily: "'Space Mono',monospace", fontSize: "10px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px" }}>
            ⏹ Finish Session
          </button>
        </div>
      </div>
    </div>
  );
}