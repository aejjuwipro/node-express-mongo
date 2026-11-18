const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/user');
const OtpChallenge = require('../models/otp-challenge');
const otpService = require('../infrastructure/otp-service');
const requireAuth = require('../middleware/require-auth');
const { safeUser, sendAuthResponse } = require('../utils/auth');
const config = require('../config/environment');

const router = express.Router();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidMobile = (mobile) => /^\+[1-9]\d{7,14}$/.test(mobile);
const hashPass = (pass) => crypto.createHmac('sha256', config.jwtSecret).update(pass).digest('hex');

router.post('/register', async (req, res, next) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string'
    || password.length < 8
    || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes' });
  }
  if (name !== undefined && (!name || name.length > 80)) {
    return res.status(400).json({ error: 'Name must be between 1 and 80 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name });
    return sendAuthResponse(res, user, 201);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    return next(error);
  }
});

router.post('/mobile/request-otp', async (req, res, next) => {
  const mobile = typeof req.body?.mobile === 'string' ? req.body.mobile.trim() : '';
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ error: 'Mobile number must be in E.164 format, for example +15551234567' });
  }

  try {
    const { provider, pass } = await otpService.sendOtp(mobile);
    const now = new Date();
    const passHash = hashPass(pass);
    await OtpChallenge.findOneAndUpdate(
      {
        mobile,
        $or: [
          { lastSentAt: { $lte: new Date(now.getTime() - OTP_RESEND_DELAY_MS) } },
          { expiresAt: { $lte: now } },
        ],
      },
      {
        $set: { passHash, expiresAt: new Date(now.getTime() + OTP_TTL_MS), attempts: 0, lastSentAt: now },
        $setOnInsert: { mobile },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.json({
      mobile,
      expiresInSeconds: OTP_TTL_MS / 1000,
      delivery: {
        provider,
        pass,
        warning: 'Mock OTP only: this pass is returned for development and is not sent by SMS.',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(429).json({ error: 'Please wait before requesting another OTP' });
    }
    return next(error);
  }
});

router.post('/mobile/verify-otp', async (req, res, next) => {
  const mobile = typeof req.body?.mobile === 'string' ? req.body.mobile.trim() : '';
  const pass = req.body?.pass;
  if (!isValidMobile(mobile) || typeof pass !== 'string' || !/^\d{6}$/.test(pass)) {
    return res.status(400).json({ error: 'A valid E.164 mobile number and six-digit pass are required' });
  }

  try {
    const challenge = await OtpChallenge.findOne({ mobile });
    const now = new Date();
    if (!challenge || challenge.expiresAt <= now) {
      return res.status(401).json({ error: 'OTP is invalid or expired' });
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect OTP attempts; request a new OTP' });
    }

    const expectedHash = Buffer.from(challenge.passHash, 'hex');
    const suppliedHash = Buffer.from(hashPass(pass), 'hex');
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
      await OtpChallenge.updateOne(
        { _id: challenge._id, attempts: { $lt: OTP_MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
      );
      return res.status(401).json({ error: 'OTP is invalid or expired' });
    }

    const consumedChallenge = await OtpChallenge.findOneAndDelete({
      _id: challenge._id,
      passHash: challenge.passHash,
      expiresAt: { $gt: now },
      attempts: { $lt: OTP_MAX_ATTEMPTS },
    });
    if (!consumedChallenge) {
      return res.status(401).json({ error: 'OTP is invalid or expired' });
    }

    const existingUser = await User.findOne({ mobile });
    const user = existingUser
      ? await User.findByIdAndUpdate(existingUser._id, { mobileVerifiedAt: now }, { new: true })
      : await User.create({ mobile, mobileVerifiedAt: now });
    return sendAuthResponse(res, user, existingUser ? 200 : 201);
  } catch (error) {
    if (error.code === 11000) {
      const user = await User.findOne({ mobile });
      if (user) {
        return sendAuthResponse(res, user);
      }
    }
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.authenticatedUser) });
});

module.exports = router;
