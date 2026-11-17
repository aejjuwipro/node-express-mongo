const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/mydb';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be set to a value of at least 32 bytes before starting the server');
}

app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const Item = mongoose.model('Item', new mongoose.Schema({ name: String }));
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}));

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createToken = (user) => jwt.sign(
  { sub: user.id },
  JWT_SECRET,
  { expiresIn: '1h' },
);

const sendAuthResponse = (res, user, status = 200) => {
  res.status(status).json({
    user: { id: user.id, email: user.email },
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
    const user = await User.findById(payload.sub).select('_id email');
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

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string'
    || password.length < 8
    || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
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
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    return next(error);
  }
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.authenticatedUser.id, email: req.authenticatedUser.email } });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
