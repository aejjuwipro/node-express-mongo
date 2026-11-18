const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/user');
const ContactVerification = require('../models/contact-verification');
const contactVerificationService = require('../infrastructure/contact-verification-service');
const requireAuth = require('../middleware/require-auth');
const { safeUser } = require('../utils/auth');
const config = require('../config/environment');

const router = express.Router();
const CONTACT_CODE_TTL_MS = 5 * 60 * 1000;
const CONTACT_CODE_RESEND_DELAY_MS = 60 * 1000;
const CONTACT_CODE_MAX_ATTEMPTS = 5;
const isValidEmail = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidMobile = (mobile) => /^\+[1-9]\d{7,14}$/.test(mobile);
const hashCode = (code) => crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.authenticatedUser._id).select('+passwordHash');
    return res.json({ user: safeUser(user), hasPassword: Boolean(user.passwordHash) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Name must be between 1 and 80 characters' });
  }

  try {
    req.authenticatedUser.name = name;
    await req.authenticatedUser.save();
    return res.json({ user: safeUser(req.authenticatedUser) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/me/password', requireAuth, async (req, res, next) => {
  const currentPassword = req.body?.currentPassword;
  const newPassword = req.body?.newPassword;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'New password must be at least 8 characters and no more than 72 bytes' });
  }

  try {
    const user = await User.findById(req.authenticatedUser._id).select('+passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(409).json({ error: 'This account does not use a password; sign in with mobile verification' });
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/me/contact-verification/request', requireAuth, async (req, res, next) => {
  const channel = req.body?.channel;
  const submittedValue = typeof req.body?.value === 'string' ? req.body.value.trim() : '';
  if (channel !== 'email' && channel !== 'mobile') {
    return res.status(400).json({ error: 'Contact channel must be email or mobile' });
  }

  const value = channel === 'email' ? submittedValue.toLowerCase() : submittedValue;
  if ((channel === 'email' && !isValidEmail(value))
    || (channel === 'mobile' && !isValidMobile(value))) {
    return res.status(400).json({
      error: channel === 'email'
        ? 'A valid email address is required'
        : 'Mobile number must be in E.164 format, for example +15551234567',
    });
  }

  const alreadyVerified = channel === 'email'
    ? req.authenticatedUser.emailVerifiedAt
    : req.authenticatedUser.mobileVerifiedAt;
  if (req.authenticatedUser[channel] === value && alreadyVerified) {
    return res.status(400).json({ error: 'This contact is already current and verified' });
  }

  try {
    const duplicateContact = await User.exists({
      [channel]: value,
      _id: { $ne: req.authenticatedUser._id },
    });
    if (duplicateContact) {
      return res.status(409).json({ error: `This ${channel} is already associated with another account` });
    }

    const now = new Date();
    const currentChallenge = await ContactVerification.findOne({
      userId: req.authenticatedUser._id,
      channel,
    });
    if (currentChallenge && now.getTime() - currentChallenge.lastSentAt.getTime() < CONTACT_CODE_RESEND_DELAY_MS) {
      return res.status(429).json({ error: 'Please wait before requesting another verification code' });
    }

    const delivery = await contactVerificationService.sendVerificationCode(channel, value);
    await ContactVerification.findOneAndUpdate(
      { userId: req.authenticatedUser._id, channel },
      {
        $set: {
          value,
          codeHash: hashCode(delivery.code),
          expiresAt: new Date(now.getTime() + CONTACT_CODE_TTL_MS),
          attempts: 0,
          lastSentAt: now,
        },
        $setOnInsert: { userId: req.authenticatedUser._id, channel },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.json({
      channel,
      value,
      expiresInSeconds: CONTACT_CODE_TTL_MS / 1000,
      delivery: {
        provider: delivery.provider,
        code: delivery.code,
        warning: delivery.warning,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(429).json({ error: 'Please wait before requesting another verification code' });
    }
    return next(error);
  }
});

router.post('/me/contact-verification/verify', requireAuth, async (req, res, next) => {
  const channel = req.body?.channel;
  const submittedValue = typeof req.body?.value === 'string' ? req.body.value.trim() : '';
  const code = req.body?.code;
  if (channel !== 'email' && channel !== 'mobile') {
    return res.status(400).json({ error: 'Contact channel must be email or mobile' });
  }

  const value = channel === 'email' ? submittedValue.toLowerCase() : submittedValue;
  if ((channel === 'email' && !isValidEmail(value))
    || (channel === 'mobile' && !isValidMobile(value))
    || typeof code !== 'string'
    || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'A valid contact and six-digit verification code are required' });
  }

  try {
    const challenge = await ContactVerification.findOne({
      userId: req.authenticatedUser._id,
      channel,
      value,
    });
    const now = new Date();
    if (!challenge || challenge.expiresAt <= now) {
      return res.status(401).json({ error: 'Verification code is invalid or expired' });
    }
    if (challenge.attempts >= CONTACT_CODE_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect verification attempts; request a new code' });
    }

    const expectedHash = Buffer.from(challenge.codeHash, 'hex');
    const suppliedHash = Buffer.from(hashCode(code), 'hex');
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
      await ContactVerification.updateOne(
        { _id: challenge._id, attempts: { $lt: CONTACT_CODE_MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
      );
      return res.status(401).json({ error: 'Verification code is invalid or expired' });
    }

    const duplicateContact = await User.exists({
      [channel]: value,
      _id: { $ne: req.authenticatedUser._id },
    });
    if (duplicateContact) {
      return res.status(409).json({ error: `This ${channel} is already associated with another account` });
    }

    const consumedChallenge = await ContactVerification.findOneAndDelete({
      _id: challenge._id,
      codeHash: challenge.codeHash,
      expiresAt: { $gt: now },
      attempts: { $lt: CONTACT_CODE_MAX_ATTEMPTS },
    });
    if (!consumedChallenge) {
      return res.status(401).json({ error: 'Verification code is invalid or expired' });
    }

    const update = channel === 'email'
      ? { email: value, emailVerifiedAt: now }
      : { mobile: value, mobileVerifiedAt: now };
    const user = await User.findByIdAndUpdate(req.authenticatedUser._id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    return res.json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: `This ${channel} is already associated with another account` });
    }
    return next(error);
  }
});

module.exports = router;
