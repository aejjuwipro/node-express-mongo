const mongoose = require('mongoose');
const User = require('../models/user');
const OtpChallenge = require('../models/otp-challenge');
const config = require('../config/environment');

const connectDatabase = async () => {
  await mongoose.connect(config.mongoUri);

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
};

module.exports = { connectDatabase };
