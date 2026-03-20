const mongoose = require('mongoose');

const AnalysisHistorySchema = new mongoose.Schema({
    entryId: { type: String, required: true },
    domain: { type: String, default: 'general' },
    type: { type: String, required: true },
    fileUrl: { type: String },
    filename: { type: String },
    result: { type: mongoose.Schema.Types.Mixed },
    analyzed_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AnalysisHistory', AnalysisHistorySchema);
