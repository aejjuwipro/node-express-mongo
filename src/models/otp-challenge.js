const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  passHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, required: true, default: 0 },
  lastSentAt: { type: Date, required: true },
});

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
