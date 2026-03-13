const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Message = require('../models/Message');
const KnowledgeSubmission = require('../models/KnowledgeSubmission');

// Apply adminMiddleware to all routes in this file
router.use(adminMiddleware);

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Admin Fetch Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.userId.toString()) {
      return res.status(403).json({ error: 'Cannot delete own admin account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Optional: Also delete associated data like messages, submissions, etc.
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Admin Delete User Error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─────────────────────────────────────────────
// COMMUNITY CHAT
// ─────────────────────────────────────────────

// GET /api/admin/chat
router.get('/chat', async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('senderId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(messages);
  } catch (err) {
    console.error('Admin Fetch Chat Error:', err);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// DELETE /api/admin/chat/:id
router.delete('/chat/:id', async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Admin Delete Chat Error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ─────────────────────────────────────────────
// KNOWLEDGE CONTRIBUTIONS
// ─────────────────────────────────────────────

// GET /api/admin/contributions
router.get('/contributions', async (req, res) => {
  try {
    const status = req.query.status;
    const filter = status && status !== 'All' ? { submissionStatus: status } : {};
    
    const submissions = await KnowledgeSubmission.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error('Admin Fetch Contributions Error:', err);
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// PATCH /api/admin/contributions/:id/status
router.patch('/contributions/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const submission = await KnowledgeSubmission.findByIdAndUpdate(
      req.params.id,
      { submissionStatus: status },
      { new: true }
    ).populate('userId', 'name email');

    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    res.json(submission);
  } catch (err) {
    console.error('Admin Update Contribution Error:', err);
    res.status(500).json({ error: 'Failed to update contribution status' });
  }
});

module.exports = router;
