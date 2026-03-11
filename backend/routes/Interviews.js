const express = require("express");
const router = express.Router();
const Interview = require("../models/Interview");
const jwt = require("jsonwebtoken");

function getUserId(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const d = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    return d.userId || d.id || null;
  } catch {
    return null;
  }
}

// ── POST /api/interviews — create or upsert ──────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      topic,
      domain,
      userName,
      questions,
      entries,
      answers,
      messages,
      closingMessage,
      questionCount,
      completedAt,
      currentQuestionIndex,
      followupCount,
      finalCount,
      completed,
      _id,
      knowledgeSummary,
      knowledgeMap,
    } = req.body;
    const userId = getUserId(req);

    // Update by _id if provided
    if (_id) {
      const ex = await Interview.findById(_id);
      if (ex) {
        const upd = (ex) => {
          if (questions !== undefined) ex.questions = questions;
          if (entries !== undefined) ex.entries = entries;
          if (answers !== undefined) ex.answers = answers;
          if (messages !== undefined) ex.messages = messages;
          if (currentQuestionIndex !== undefined)
            ex.currentQuestionIndex = currentQuestionIndex;
          if (followupCount !== undefined) ex.followupCount = followupCount;
          if (finalCount !== undefined) ex.finalCount = finalCount;
          if (questionCount !== undefined) ex.questionCount = questionCount;
          if (completed !== undefined) ex.completed = completed;
          if (closingMessage) ex.closingMessage = closingMessage;
          if (knowledgeSummary) ex.knowledgeSummary = knowledgeSummary;
          if (knowledgeMap) ex.knowledgeMap = knowledgeMap;
          if (completed)
            ex.completedAt = completedAt ? new Date(completedAt) : new Date();
        };
        upd(ex);
        await ex.save();
        return res.json({ success: true, id: ex._id, updated: true });
      }
    }

    // Upsert by userId + topic (incomplete)
    if (userId) {
      const ex = await Interview.findOne({
        userId,
        topic,
        completed: false,
      }).sort({ createdAt: -1 });
      if (ex) {
        upd(ex);
        await ex.save();
        return res.json({ success: true, id: ex._id, updated: true });
      }
    }

    // Create new
    const iv = await Interview.create({
      topic,
      domain,
      userName,
      questions: questions || [],
      entries: entries || [],
      answers: answers || [],
      messages: messages || [],
      knowledgeSummary: knowledgeSummary || [],
      knowledgeMap: knowledgeMap || null,
      closingMessage: closingMessage || "",
      questionCount: questionCount || 0,
      currentQuestionIndex: currentQuestionIndex || 0,
      followupCount: followupCount || 0,
      finalCount: finalCount || 0,
      completed: completed || false,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      userId,
    });
    res.status(201).json({ success: true, id: iv._id });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save interview" });
  }
});

// ── GET /api/interviews/resume — latest session for resume ───────────────────
router.get("/resume", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { topic } = req.query;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const iv = await Interview.findOne({ userId, topic }).sort({
      createdAt: -1,
    });
    if (!iv) return res.status(404).json({ error: "No session" });

    res.json({
      _id: iv._id,
      questions: iv.questions,
      entries: iv.entries,
      answers: iv.answers,
      currentQuestionIndex: iv.currentQuestionIndex,
      followupCount: iv.followupCount,
      finalCount: iv.finalCount,
      completed: iv.completed,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// ── GET /api/interviews/history — all interviews for a topic (Knowledge tab) ─
router.get("/history", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { topic } = req.query;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const list = await Interview.find({ userId, topic })
      .sort({ createdAt: -1 })
      .select(
        "topic domain questionCount completed completedAt createdAt knowledgeSummary knowledgeMap entries answers questions",
      );

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ── PATCH /api/interviews/:id/summary — save extracted knowledge summary ─────
router.patch("/:id/summary", async (req, res) => {
  try {
    const { knowledgeSummary, knowledgeMap } = req.body;
    const update = {};
    if (knowledgeSummary) update.knowledgeSummary = knowledgeSummary;
    if (knowledgeMap) update.knowledgeMap = knowledgeMap;
    const iv = await Interview.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );
    if (!iv) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update summary" });
  }
});

// ── GET /api/interviews — list all user interviews ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const list = await Interview.find({ userId })
      .sort({ createdAt: -1 })
      .select(
        "topic domain questionCount completed completedAt createdAt knowledgeSummary",
      );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// ── GET /api/interviews/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const iv = await Interview.findById(req.params.id);
    if (!iv) return res.status(404).json({ error: "Not found" });
    res.json(iv);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
