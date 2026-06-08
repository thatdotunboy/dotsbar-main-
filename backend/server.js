require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./config/database');
const mongoose = require('mongoose');

// Fix for Node 18+ fetch failed on Windows
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
let server = null;
let io = null;
let users = [];
let rooms = [];
let events = [];

if (require.main === module) {
  const http = require('http');
  const socketIo = require('socket.io');
  server = http.createServer(app);
  io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
}

const JWT_SECRET = process.env.JWT_SECRET || 'dotsbar_super_secret_key_2026';
const SPORTS_API_KEY = process.env.SPORTS_API_KEY || '';
const SPORTS_API_HOST = process.env.SPORTS_API_HOST || 'api-football-v1.p.rapidapi.com';
const SPORTS_LEAGUE_ID = process.env.SPORTS_LEAGUE_ID || '39';
const SPORTS_SEASON = process.env.SPORTS_SEASON || '2025';

const User = require('./models/User');
const Room = require('./models/Room');
const Event = require('./models/Event');
const Product = require('./models/Product');
const ChatMessage = require('./models/ChatMessage');
const PushSubscription = require('./models/PushSubscription');

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

// Live Premier League match stubs (rotate scores over time for realism)
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
    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isCreator: isCreator || false,
      balance: 0
    });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isCreator: newUser.isCreator,
        balance: newUser.balance
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
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, isCreator: user.isCreator, balance: user.balance } });
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
    res.json({ id:user._id, username:user.username, email:user.email, isCreator:user.isCreator, balance:user.balance, createdAt:user.createdAt });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const update = {};
    if (username) update.username = username;
    if (bio) update['profile.bio'] = bio;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id:user._id, username:user.username, email:user.email, isCreator:user.isCreator, balance:user.balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function fetchLiveMatchesFromProvider() {
  const d = new Date();
  const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}&s=Soccer`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000), // 5 second timeout
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

// ── Events API ─────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.json({ events, total: events.length });
});

app.get('/api/events/live', (req, res) => {
  const liveEvents = events.filter(e => e.live);
  res.json({ events: liveEvents, total: liveEvents.length });
});

app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, category, datetime, type, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const user = await User.findById(req.user.id);
    const event = {
      id: Date.now().toString(),
      title,
      host: user?.username || 'Anonymous',
      hostId: req.user.id,
      category: category || 'general',
      datetime: datetime || new Date().toISOString(),
      type: type || 'Free',
      price: price || 0,
      viewers: 0,
      live: false,
      createdAt: new Date().toISOString()
    };
    events.push(event);
    io?.emit?.('new-event', event);
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/events/:id', verifyToken, (req, res) => {
  const idx = events.findIndex(e => e.id === req.params.id && e.hostId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found or not authorised' });
  events.splice(idx, 1);
  res.json({ success: true });
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
    const topTippers = await User.find().sort({ totalTipped: -1 }).limit(10).select('username totalTipped');
    res.json({ topTippers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Rooms ──────────────────────────────────────────
app.post('/api/rooms', verifyToken, (req, res) => {
  try {
    const { name, description } = req.body;
    const room = {
      id: Date.now().toString(), name, description,
      creatorId: req.user.id, viewers: [], chatMessages: [], tipsTotal: 0,
      createdAt: new Date().toISOString()
    };
    rooms.push(room);
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const list = await Promise.all(rooms.map(async r => {
      const creatorDoc = await User.findById(r.creatorId);
      return {
        ...r,
        creatorId: r.creatorId,
        creator: creatorDoc?.username || 'Unknown',
        viewerCount: r.viewers.length
      };
    }));
    res.json({ rooms: list, total: list.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ── Serve static files ─────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Socket.io ──────────────────────────────────────
const activeRooms = new Map();
const socketUsers = new Map(); // socketId → user info


if (!process.env.VERCEL) {
  const http = require('http');
  const socketIo = require('socket.io');
  server = http.createServer(app);
  io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  // Socket.io event handlers
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
    socket.on('chat-message', ({ roomId, message }) => {
      const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
      const msg = { username: user.username, message, timestamp: new Date().toISOString(), socketId: socket.id };
      io.to(roomId).emit('chat-message', msg);
      // Persist in room
      const room = rooms.find(r => r.name === roomId || r.id === roomId);
      if (room) room.chatMessages.push(msg);
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
        const fromUserDoc = await User.findById(socketUsers.get(socket.id)?.id);
        const toUserDoc = await User.findById(creatorId);
        if (!fromUserDoc || !toUserDoc) {
          return socket.emit('error', 'User not found');
        }
        if (fromUserDoc.balance >= amount) {
          fromUserDoc.balance -= amount;
          toUserDoc.balance += amount;
          fromUserDoc.totalTipped = (fromUserDoc.totalTipped || 0) + amount;
          await fromUserDoc.save();
          await toUserDoc.save();
          const room = rooms.find(r => r.id === roomId);
          if (room) room.tipsTotal += amount;
          io.to(roomId).emit('tip-received', { from: fromUserDoc.username, amount, creatorId });
          socket.emit('tip-sent', { amount, newBalance: fromUserDoc.balance });
        } else {
          socket.emit('error', 'Insufficient DotsCoins');
        }
      } catch (err) {
        socket.emit('error', err.message);
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
}

// ── Start ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
db();
if (require.main === module && server) {
  server.listen(PORT, () => {
    console.log(`
🍺 ===================================
   DotsBar Server Running!
   http://localhost:${PORT}
🍺 ===================================
    `);
  });
}

// ── 404 Handler for API routes ────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── 404 Fallback for frontend ──────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.server = server;
app.io = io;
module.exports = app;
