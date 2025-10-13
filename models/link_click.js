const mongoose = require('mongoose');

const linkClickSchema = new mongoose.Schema({
  linkKey: { type: String, required: true, enum: ['instagram', 'youtube', 'tiktok'] },
  clientId: { type: String, required: true }, // anonymous or user-based unique id
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure one record per clientId per linkKey for uniqueness
linkClickSchema.index({ linkKey: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('link_clicks', linkClickSchema);


