const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["core", "followup", "final"], required: true },
    question: { type: String, required: true },
    answer: { type: String, default: null },
    parentIndex: { type: Number, default: null },
    layer: { type: Number, default: null }, // 1-5 knowledge layer
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["ai", "user"], required: true },
    text: { type: String, required: true },
    type: { type: String, default: "normal" },
  },
  { _id: false },
);

const interviewSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    domain: { type: String, default: "" },
    userName: { type: String, default: "Anonymous" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    questions: [{ type: String }], // 15 core questions
    entries: [entrySchema], // full interview log (core+followup+final)
    answers: [{ type: String }], // flat answers list
    knowledgeSummary: [{ type: String }], // bullet points
    knowledgeMap: { type: mongoose.Schema.Types.Mixed, default: null }, // structured map
    knowledgePortrait: { type: mongoose.Schema.Types.Mixed, default: null }, // rich portrait (sensory, failures, secrets, etc.)
    layerCoverage: { type: mongoose.Schema.Types.Mixed, default: {} }, // {1: true/false, 2: true/false, ...}
    completenessScore: { type: Number, default: 0 }, // 0-100
    followUpNeeded: { type: Boolean, default: false },
    messages: [messageSchema],
    closingMessage: { type: String, default: "" },
    questionCount: { type: Number, default: 0 },
    currentQuestionIndex: { type: Number, default: 0 },
    followupCount: { type: Number, default: 0 },
    finalCount: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

interviewSchema.index({ userId: 1, topic: 1, createdAt: -1 });
module.exports = mongoose.model("Interview", interviewSchema);
