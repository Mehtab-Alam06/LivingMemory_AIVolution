const mongoose = require('mongoose');

const KnowledgeSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Personal Details
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  country: { type: String, trim: true },
  stateRegion: { type: String, trim: true },
  community: { type: String, trim: true },
  ageGroup: { type: String, trim: true },

  // Knowledge Information
  knowledgeTitle: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  domain: {
    type: String,
    required: true,
    enum: [
      'Traditional Medicine',
      'Agriculture',
      'Food Preservation',
      'Ecology / Environment',
      'Cultural Practices',
      'Craftsmanship',
      'Language / Oral Traditions',
      'Survival Skills',
      'Other'
    ]
  },
  ownershipType: {
    type: String,
    required: true,
    enum: ['only-you', 'family', 'community', 'regional']
  },
  knowledgeRegion: { type: String, trim: true },
  knowledgeAge: {
    type: String,
    enum: ['<50 years', '50-100 years', '100-500 years', '500+ years', 'Unknown']
  },

  // Knowledge Explanation
  explanation: { type: String, required: true },
  useCase: { type: String },
  problemSolved: { type: String },
  materials: { type: String },
  mediaFiles: [{ type: String }],

  // Ownership & Permissions
  permissionStatus: {
    type: String,
    enum: ['yes', 'no', 'needs-approval'],
    default: 'yes'
  },
  confirmAccuracy: { type: Boolean, default: false },
  creditedAuthor: { type: Boolean, default: false },

  // Status & Tracking
  submissionStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  trackingId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KnowledgeSubmission', KnowledgeSubmissionSchema);
