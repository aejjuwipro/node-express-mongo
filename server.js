const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const otpService = require('./otp-service');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/mydb';
const JWT_SECRET = process.env.JWT_SECRET;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a value of at least 32 bytes before starting the server');
}

app.use(express.json());

const Item = mongoose.model('Item', new mongoose.Schema({ name: String }));
const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80 },
  email: { type: String, lowercase: true, trim: true },
  passwordHash: { type: String, required: false, select: false },
  mobile: { type: String, trim: true },
  mobileVerifiedAt: Date,
}, { timestamps: true, autoIndex: false });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ mobile: 1 }, { unique: true, sparse: true });
const User = mongoose.model('User', userSchema);

const otpChallengeSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  passHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, required: true, default: 0 },
  lastSentAt: { type: Date, required: true },
});
const OtpChallenge = mongoose.model('OtpChallenge', otpChallengeSchema);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidMobile = (mobile) => /^\+[1-9]\d{7,14}$/.test(mobile);
const hashPass = (pass) => crypto.createHmac('sha256', JWT_SECRET).update(pass).digest('hex');
const safeUser = (user) => ({
  id: user.id,
  name: user.name || null,
  email: user.email || null,
  mobile: user.mobile || null,
  mobileVerified: Boolean(user.mobileVerifiedAt),
});

const createToken = (user) => jwt.sign(
  { sub: user.id },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const sendAuthResponse = (res, user, status = 200) => {
  res.status(status).json({
    user: safeUser(user),
    token: createToken(user),
  });
};

const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(payload.sub)
      .select('_id name email mobile mobileVerifiedAt');
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'Express + MongoDB running in Docker on WSL!' });
});

app.post('/auth/register', async (req, res, next) => {
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

app.post('/auth/login', async (req, res, next) => {
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

app.post('/auth/mobile/request-otp', async (req, res, next) => {
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

app.post('/auth/mobile/verify-otp', async (req, res, next) => {
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

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.authenticatedUser) });
});

app.get('/users/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.authenticatedUser) });
});

app.patch('/users/me', requireAuth, async (req, res, next) => {
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

app.post('/items', async (req, res) => {
  const item = await Item.create({ name: req.body.name });
  res.status(201).json(item);
});

app.get('/items', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

app.use((err, req, res, next) => {
  console.error('Request error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  await mongoose.connect(MONGO_URI);
  const indexes = await User.collection.indexes();
  const oldEmailIndex = indexes.find((index) => (
    index.key.email === 1 && index.unique && !index.sparse && !index.partialFilterExpression
  ));
  if (oldEmailIndex) {
    await User.collection.dropIndex(oldEmailIndex.name);
  }
  await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
  await User.collection.createIndex({ mobile: 1 }, { unique: true, sparse: true });
  await OtpChallenge.init();
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Application startup failed:', error);
  process.exitCode = 1;
});
