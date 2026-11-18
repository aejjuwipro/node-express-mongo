const express = require('express');
const Item = require('../models/item');

const router = express.Router();

router.post('/', async (req, res) => {
  const item = await Item.create({ name: req.body.name });
  res.status(201).json(item);
});

router.get('/', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

module.exports = router;
