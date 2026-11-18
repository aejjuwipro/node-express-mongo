const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80 },
  email: { type: String, lowercase: true, trim: true },
  emailVerifiedAt: Date,
  passwordHash: { type: String, required: false, select: false },
  mobile: { type: String, trim: true },
  mobileVerifiedAt: Date,
}, { timestamps: true, autoIndex: false });

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ mobile: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
