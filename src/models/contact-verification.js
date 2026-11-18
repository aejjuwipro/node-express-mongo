const mongoose = require('mongoose');

const contactVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  channel: { type: String, enum: ['email', 'mobile'], required: true },
  value: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, required: true, default: 0 },
  lastSentAt: { type: Date, required: true },
}, { timestamps: true });

contactVerificationSchema.index({ userId: 1, channel: 1 }, { unique: true });
contactVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ContactVerification', contactVerificationSchema);
