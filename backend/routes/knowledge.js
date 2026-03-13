const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const KnowledgeSubmission = require('../models/KnowledgeSubmission');

// ─────────────────────────────────────────────
// Generate Tracking ID: KM-YYYY-XXXX
// ─────────────────────────────────────────────
async function generateTrackingId() {
  const year = new Date().getFullYear();
  const count = await KnowledgeSubmission.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `KM-${year}-${seq}`;
}

// ─────────────────────────────────────────────
// POST /api/knowledge/submit
// ─────────────────────────────────────────────
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const {
      name, email, phone, country, stateRegion, community, ageGroup,
      knowledgeTitle, description, domain, ownershipType,
      knowledgeRegion, knowledgeAge,
      explanation, useCase, problemSolved, materials, queryForTeam, mediaFiles,
      permissionStatus, confirmAccuracy, creditedAuthor
    } = req.body;

    // Validation
    const errors = [];
    if (!knowledgeTitle?.trim()) errors.push('Knowledge Title is required');
    if (!description?.trim()) errors.push('Description is required');
    if (!domain) errors.push('Domain category is required');
    if (!ownershipType) errors.push('Ownership type is required');
    if (!explanation?.trim()) errors.push('Knowledge explanation is required');

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const trackingId = await generateTrackingId();

    const submission = await KnowledgeSubmission.create({
      userId: req.user.userId,
      name, email, phone, country, stateRegion, community, ageGroup,
      knowledgeTitle: knowledgeTitle.trim(),
      description: description.trim(),
      domain, ownershipType,
      knowledgeRegion, knowledgeAge,
      explanation: explanation.trim(),
      useCase, problemSolved, materials, queryForTeam,
      mediaFiles: mediaFiles || [],
      permissionStatus: permissionStatus || 'yes',
      confirmAccuracy: !!confirmAccuracy,
      creditedAuthor: !!creditedAuthor,
      trackingId
    });

    res.json({
      message: 'Knowledge submitted successfully',
      trackingId: submission.trackingId,
      submissionId: submission._id
    });

  } catch (err) {
    console.error('❌ KNOWLEDGE SUBMIT ERROR:', err);
    res.status(500).json({ error: 'Failed to submit knowledge' });
  }
});

// ─────────────────────────────────────────────
// GET /api/knowledge/my-submissions
// ─────────────────────────────────────────────
router.get('/my-submissions', authMiddleware, async (req, res) => {
  try {
    const submissions = await KnowledgeSubmission.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('knowledgeTitle domain submissionStatus trackingId createdAt');

    res.json(submissions);
  } catch (err) {
    console.error('❌ MY SUBMISSIONS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ─────────────────────────────────────────────
// GET /api/knowledge/stats
// ─────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [total, pending, approved, rejected] = await Promise.all([
      KnowledgeSubmission.countDocuments({ userId }),
      KnowledgeSubmission.countDocuments({ userId, submissionStatus: 'Pending' }),
      KnowledgeSubmission.countDocuments({ userId, submissionStatus: 'Approved' }),
      KnowledgeSubmission.countDocuments({ userId, submissionStatus: 'Rejected' })
    ]);

    res.json({ total, pending, approved, rejected });
  } catch (err) {
    console.error('❌ STATS ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/knowledge/submission/:id
// ─────────────────────────────────────────────
router.get('/submission/:id', authMiddleware, async (req, res) => {
  try {
    const submission = await KnowledgeSubmission.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json(submission);
  } catch (err) {
    console.error('❌ SUBMISSION DETAIL ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/knowledge/edit/:id
// ─────────────────────────────────────────────
router.put('/edit/:id', authMiddleware, async (req, res) => {
  try {
    const {
      name, email, phone, country, stateRegion, community, ageGroup,
      knowledgeTitle, description, domain, ownershipType,
      knowledgeRegion, knowledgeAge,
      explanation, useCase, problemSolved, materials, queryForTeam, mediaFiles,
      permissionStatus, confirmAccuracy, creditedAuthor
    } = req.body;

    const submission = await KnowledgeSubmission.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        name, email, phone, country, stateRegion, community, ageGroup,
        knowledgeTitle: knowledgeTitle?.trim(),
        description: description?.trim(),
        domain, ownershipType,
        knowledgeRegion, knowledgeAge,
        explanation: explanation?.trim(),
        useCase, problemSolved, materials, queryForTeam,
        mediaFiles: mediaFiles || [],
        permissionStatus: permissionStatus || 'yes',
        confirmAccuracy: !!confirmAccuracy,
        creditedAuthor: !!creditedAuthor,
        submissionStatus: 'Pending' // Reset to pending after edit
      },
      { new: true }
    );

    if (!submission) return res.status(404).json({ error: 'Submission not found or unauthorized' });

    res.json({ message: 'Submission updated successfully', submission });
  } catch (err) {
    console.error('❌ KNOWLEDGE EDIT ERROR:', err);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/knowledge/delete/:id
// ─────────────────────────────────────────────
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await KnowledgeSubmission.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!deleted) return res.status(404).json({ error: 'Submission not found or unauthorized' });
    
    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    console.error('❌ KNOWLEDGE DELETE ERROR:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

module.exports = router;

