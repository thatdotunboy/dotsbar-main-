// api/auth.js
const { json } = require('micro');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('../lib/db');
const User = require('../models/User');

module.exports = async (req, res) => {
  await json(req); // parse body
  await connectToDatabase();
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

  if (req.method === 'POST' && req.url === '/register') {
    const { username, email, password, isCreator } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: hashed, isCreator: !!isCreator });
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, username, email, isCreator: user.isCreator, balance: user.balance } });
  }

  if (req.method === 'POST' && req.url === '/login') {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, username: user.username, email, isCreator: user.isCreator, balance: user.balance } });
  }

  // Any other request → 405
  res.status(405).json({ error: 'Method not allowed' });
};
