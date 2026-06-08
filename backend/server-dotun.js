require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dns = require('dns');

// Fix for Node 18+ fetch failed on Windows
dns.setDefaultResultOrder('ipv4first');

const fetch = global.fetch || require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dotsbar_super_secret_key_2026';
const SPORTS_API_KEY = process.env.SPORTS_API_KEY || '';
const SPORTS_API_HOST = process.env.SPORTS_API_HOST || 'api-football-v1.p.rapidapi.com';
const SPORTS_LEAGUE_ID = process.env.SPORTS_LEAGUE_ID || '39';
const SPORTS_SEASON = process.env.SPORTS_SEASON || '2025';

const { connectToDatabase } = require('../lib/db');
const User = require('../models/User');
const Room = require('../models/Room');
const Event = require('../models/Event');
const { Types: { ObjectId } } = require('mongoose');

// Static stubs (until you wire fully into DB)
const products = [
  { id:1, name:'Guinness Draft', emoji:'🍺', image:'images/Guinness Draft.jpg', desc:'The classic. Cold, dark & smooth.', price:120, cat:'drinks', badge:'Best Seller' },
  { id:2, name:'Heineken Bottle', emoji:'🍶', image:'images/Heineken Bottle.jpg', desc:'Crisp & refreshing lager.', price:100, cat:'drinks' },
  { id:3, name:'Craft IPA', emoji:'🍻', image:'images/Craft IPA.jpg', desc:'Hoppy, bold, and local.', price:130, cat:'drinks' },
  { id:4, name:'Neon Spritz', emoji:'🍹', image:'images/Neon Spritz.jpg', desc:'Pink, fizzy, legendary.', price:200, cat:'cocktails', badge:'Fan Fave' },
  { id:5, name:'Mojito', emoji:'🌿', image:'images/Mojito.jpg', desc:'Mint, lime, perfection.', price:180, cat:'cocktails' },
  { id:6, name:'Smoky Scotch', emoji:'🥃', image:'images/Smoky Scotch.jpg', desc:'Highland single malt.', price:350, cat:'shots', badge:'Premium' },
  { id:7, name:'Tequila Shot', emoji:'🍋', image:'images/Tequila Shot.jpg', desc:'Salt. Shot. Lime. Repeat.', price:150, cat:'shots' },
  { id:8, name:'Loaded Nachos', emoji:'🧀', image:'images/Loaded Nachos.jpg', desc:'Cheese, jalapeño, guacamole.', price:150, cat:'food' },
  { id:9, name:'Chicken Wings', emoji:'🍗', image:'images/Chicken Wings.jpg', desc:'Sticky BBQ glazed wings.', price:200, cat:'food', badge:'Match Day' },
  { id:10, name:'DotsBar Tee', emoji:'👕', desc:'Official DotsBar streetwear.', price:800, cat:'merch', badge:'Limited' },
  { id:11, name:'Gold Pint Badge', emoji:'🏅', desc:'Exclusive collector badge.', price:500, cat:'collectibles', badge:'Rare' },
  { id:12, name:'Match Day Trophy NFT', emoji:'🏆', desc:'Limited edition match day drop.', price:1000, cat:'collectibles', badge:'Ultra Rare' },
];

let matchMinutes = { 0: 72, 1: 34, 2: 58, 3: 81, 4: 45, 5: 22 };
const matchData = [
  { home:'Arsenal', homeCode:'ARS', away:'Chelsea', awayCode:'CHE', score:[2,1], homeEmoji:'🔴', awayEmoji:'🔵' },
  { home:'Man City', homeCode:'MCI', away:'Liverpool', awayCode:'LIV', score:[0,0], homeEmoji:'💙', awayEmoji:'❤️' },
  { home:'Spurs', homeCode:'TOT', away:'Man Utd', awayCode:'MUN', score:[1,2], homeEmoji:'⬜', awayEmoji:'🔴' },
  { home:'Newcastle', homeCode:'NEW', away:'Everton', awayCode:'EVE', score:[3,0], homeEmoji:'⚫', awayEmoji:'💙' },
  { home:'Brighton', homeCode:'BHA', away:'Wolves', awayCode:'WOL', score:[1,1], homeEmoji:'🔵', awayEmoji:'🟡' },
  { home:'West Ham', homeCode:'WHU', away:'Brentford', awayCode:'BRE', score:[0,1], homeEmoji:'⚒️', awayEmoji:'🐝' },
];


// Tick match minutes every 60s
setInterval(() => {
  Object.keys(matchMinutes).forEach(k => {
    if (matchMinutes[k] < 90) matchMinutes[k]++;
  });
}, 60000);

// ── Middleware ─────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Auth routes ────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, isCreator } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isCreator: !!isCreator,
      balance: 0
    });

    const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isCreator: user.isCreator,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isCreator: user.isCreator,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'DotsBar API is healthy' });
});

app.get('/api/profile/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isCreator: user.isCreator,
      balance: user.balance,
      createdAt: user.createdAt
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { username, bio } = req.body;
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    await user.save();
    res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isCreator: user.isCreator,
      balance: user.balance
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


async function fetchLiveMatchesFromProvider() {
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}&s=Soccer`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DotsBar/1.0' }
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sports API failed: ${response.status} ${text}`);
  }
  
  const payload = await response.json();
  if (!payload.events) {
    throw new Error('Unexpected sports API response');
  }
  
  // Return up to 10 matches
  return payload.events.slice(0, 10).map((item) => ({
    home: item.strHomeTeam,
    homeEmoji: '⚽',
    away: item.strAwayTeam,
    awayEmoji: '⚽',
    score: `${item.intHomeScore ?? 0}-${item.intAwayScore ?? 0}`,
    min: item.strStatus === 'Match Finished' ? 90 : (item.strTime ? parseInt(item.strTime.split(':')[1] || 0) : 0), // Mock minute based on time if live/scheduled
    status: item.strStatus || 'LIVE',
    league: item.strLeague || 'Soccer',
    viewers: Math.floor(500 + Math.random() * 1500)
  }));
}

let matchesCache = { data: [], fetchedAt: 0 };

async function getLiveMatches() {
  if (matchesCache.data.length && Date.now() - matchesCache.fetchedAt < 20000) {
    return matchesCache.data;
  }
  try {
    const data = await fetchLiveMatchesFromProvider();
    matchesCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    if (matchesCache.data.length) {
      return matchesCache.data;
    }
    throw error;
  }
}

// ── Matches API (Premier League stub)
app.get('/api/matches', async (req, res) => {
  try {
    const data = await getLiveMatches();
    res.json({ matches: data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Live matches fetch failed:', error.message);
    const data = matchData.map((m, i) => ({
      ...m,
      score: Array.isArray(m.score) ? `${m.score[0]}-${m.score[1]}` : m.score,
      min: matchMinutes[i],
      minute: matchMinutes[i],
      status: matchMinutes[i] >= 90 ? 'FT' : 'LIVE',
      league: 'Premier League',
      season: '2025/26',
      viewers: Math.floor(500 + Math.random() * 1500)
    }));
    res.json({ matches: data, updatedAt: new Date().toISOString(), warning: 'Using fallback stub data. Set SPORTS_API_KEY to enable real live updates.' });
  }
});

// ── Events API (DB-backed) ─────────────────────────────────────
app.get('/api/events', async (req, res) => {
  const all = await Event.find({}).sort({ createdAt: -1 }).lean();
  res.json({ events: all, total: all.length });
});

app.get('/api/events/live', async (req, res) => {
  const liveEvents = await Event.find({ live: true }).sort({ createdAt: -1 }).lean();
  res.json({ events: liveEvents, total: liveEvents.length });
});

app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, category, datetime, type, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const user = await User.findById(req.user.id).lean();
    const event = await Event.create({
      title,
      host: user?.username || 'Anonymous',
      hostId: req.user.id,
      category: category || 'general',
      datetime: datetime ? new Date(datetime) : new Date(),
      type: type || 'Free',
      price: price || 0,
      viewers: 0,
      live: false
    });

    io.emit('new-event', event.toObject());
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found or not authorised' });
    if (event.hostId.toString() !== req.user.id) return res.status(404).json({ error: 'Event not found or not authorised' });
    await event.deleteOne();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// ── Products / Marketplace ─────────────────────────
app.get('/api/products', (req, res) => {
  const { cat } = req.query;
  const filtered = cat ? products.filter(p => p.cat === cat) : products;
  res.json({ products: filtered, total: filtered.length });
});

// ── Leaderboard ────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}).select('username totalTipped').lean();
    const topTippers = users
      .map(u => ({ username: u.username, totalTipped: u.totalTipped || 0 }))
      .sort((a, b) => b.totalTipped - a.totalTipped)
      .slice(0, 10);
    res.json({ topTippers });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// ── Rooms (DB-backed) ──────────────────────────────────────────
app.post('/api/rooms', verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const room = await Room.create({
      name,
      description,
      creatorId: req.user.id,
      viewers: [],
      chatMessages: [],
      tipsTotal: 0
    });

    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  const list = await Room.find({}).sort({ createdAt: -1 }).lean();
  const creatorIds = [...new Set(list.map(r => String(r.creatorId)))];
  const creators = await User.find({ _id: { $in: creatorIds } }).lean();
  const creatorById = new Map(creators.map(c => [String(c._id), c]));

  const roomsOut = list.map(r => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    creatorId: r.creatorId?.toString?.() || r.creatorId,
    creator: creatorById.get(String(r.creatorId))?.username || 'Unknown',
    viewerCount: Array.isArray(r.viewers) ? r.viewers.length : 0,
    tipsTotal: r.tipsTotal,
    createdAt: r.createdAt
  }));

  res.json({ rooms: roomsOut, total: roomsOut.length });
});


// ── Serve static files ─────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Socket.io ──────────────────────────────────────
const activeRooms = new Map();
const socketUsers = new Map(); // socketId → user info

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);


  // Auth handshake
  socket.on('auth', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socketUsers.set(socket.id, { id: decoded.id, username: decoded.username });
      socket.emit('auth-ok', { username: decoded.username });
    } catch {
      socket.emit('auth-error', 'Invalid token');
    }
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Set());
    activeRooms.get(roomId).add(socket.id);

    const count = activeRooms.get(roomId).size;
    io.to(roomId).emit('viewer-count', { roomId, count });
    socket.to(roomId).emit('user-joined', { socketId: socket.id, username: socketUsers.get(socket.id)?.username || 'Anonymous' });

    console.log(`📺 ${socket.id} joined room ${roomId} (${count} viewers)`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(socket.id);
      const count = activeRooms.get(roomId).size;
      io.to(roomId).emit('viewer-count', { roomId, count });
    }
    socket.to(roomId).emit('user-left', { socketId: socket.id });
  });

  // WebRTC signalling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
  });
  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
  });
  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  // Chat
  socket.on('chat-message', async ({ roomId, message }) => {
    try {
      if (!roomId || typeof message !== 'string') return;

      const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
      const room = await Room.findById(roomId);
      if (!room) return;

      const msg = {
        username: user.username || 'Anonymous',
        message,
        timestamp: new Date()
      };

      room.chatMessages.push(msg);
      await room.save();

      io.to(roomId).emit('chat-message', {
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        socketId: socket.id
      });
    } catch (e) {
      // ignore
    }
  });



  // Global bar chat
  socket.on('bar-chat', ({ message }) => {
    const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
    io.emit('bar-chat', { username: user.username, message, timestamp: new Date().toISOString() });
  });

  // Reactions
  socket.on('reaction', ({ roomId, emoji }) => {
    const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
    io.to(roomId).emit('reaction', { emoji, username: user.username });
  });

  // Tip
  socket.on('tip', async ({ roomId, amount, creatorId }) => {
    try {
      const fromInfo = socketUsers.get(socket.id);
      if (!fromInfo) return;

      const amt = Number(amount);
      if (!roomId || !creatorId || !Number.isFinite(amt) || amt <= 0) return;

      const [fromUser, toUser, room] = await Promise.all([
        User.findById(fromInfo.id),
        User.findById(creatorId),
        Room.findById(roomId)
      ]);

      if (!fromUser || !toUser || !room) return;
      if (fromUser.balance < amt) {
        socket.emit('error', 'Insufficient DotsCoins');
        return;
      }

      fromUser.balance -= amt;
      toUser.balance += amt;
      fromUser.totalTipped = (fromUser.totalTipped || 0) + amt;
      room.tipsTotal = (room.tipsTotal || 0) + amt;

      await Promise.all([fromUser.save(), toUser.save(), room.save()]);

      io.to(roomId).emit('tip-received', { from: fromUser.username, amount: amt, creatorId });
      socket.emit('tip-sent', { amount: amt, newBalance: fromUser.balance });
    } catch (e) {
      // ignore
    }
  });


  socket.on('disconnect', () => {
    console.log('🔌 Disconnected:', socket.id);
    activeRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        io.to(roomId).emit('viewer-count', { roomId, count: users.size });
      }
    });
    socketUsers.delete(socket.id);
  });
});

// ── Start ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  await connectToDatabase();
  server.listen(PORT, () => {
    console.log(`
🍺 ===================================
   DotsBar Server Running!
   http://localhost:${PORT}
🍺 ===================================
    `);
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

app.server = server;
app.io = io;
module.exports = app;
