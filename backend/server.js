require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Auth handled via Firebase now

const { initializeFirebase, getFirestore } = require('./firebase');
const firestoreService = require('./firestore-service');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`❌ Required environment variable ${name} is missing`);
    process.exit(1);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const SPORTS_API_KEY = process.env.SPORTS_API_KEY || '';
const SPORTS_API_HOST = process.env.SPORTS_API_HOST || 'api-football-v1.p.rapidapi.com';
const SPORTS_LEAGUE_ID = process.env.SPORTS_LEAGUE_ID || '39';
const SPORTS_SEASON = process.env.SPORTS_SEASON || '2025';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isValidEmail = (value) => emailPattern.test(String(value || '').trim());
const useFirestore = true;
const mongoReady = false;

// Fix for Node 18+ fetch failed on Windows
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();
let server = null;
let io = null;

if (require.main === module) {
  const http = require('http');
  const socketIo = require('socket.io');
  server = http.createServer(app);
  io = socketIo(server, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }
  });
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const User = require('./models/User');
const Room = require('./models/Room');
const Event = require('./models/Event');
const ChatMessage = require('./models/ChatMessage');
const Announcement = require('./models/Announcement');


const PushSubscription = require('./models/PushSubscription');

// Marketplace removed (virtual drinks / NFTs / collectibles / metaverse shop)


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
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth middleware using Firebase Admin Auth
const { getAuth } = require('./firebase');
const verifyToken = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const auth = getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');
    const decodedToken = await auth.verifyIdToken(token);
    const user = await firestoreService.findUserById(decodedToken.uid);
    if (!user) throw new Error('User not found in database');
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Auth routes ────────────────────────────────────
// This sync endpoint is called after the client authenticates with Firebase.
// It ensures a Firestore user document exists for this Firebase user.
app.post('/api/auth/sync', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const auth = getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');

    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Check if user exists in Firestore
    let user = await firestoreService.findUserById(uid);
    if (!user) {
      // If it's a new user, they passed 'username' and 'isCreator' in the body during sign-up
      const username = String(req.body.username || email.split('@')[0]).trim();
      const isCreator = Boolean(req.body.isCreator);
      
      user = await firestoreService.createUser({
        id: uid,
        username,
        email,
        isCreator,
        balance: 1000 // give 1000 coins to new users
      });
    }

    return res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        isCreator: user.isCreator, 
        balance: user.balance 
      } 
    });
  } catch (error) {
    console.error('Auth sync error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, message: 'DotsBar API is healthy' });
});

app.get('/api/health', async (req, res) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not configured');
    res.json({ ok: true, database: 'firestore', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/firebase-health', async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) {
    return res.status(503).json({ ok: false, error: 'Firebase is not configured' });
  }

  try {
    const now = new Date().toISOString();
    await firestore.collection('_health').doc('ping').set({ updatedAt: now }, { merge: true });
    res.json({ ok: true, updatedAt: now });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/profile/:id', verifyToken, async (req, res) => {
  try {
    const user = await firestoreService.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ id: user.id, username: user.username, email: user.email, isCreator: user.isCreator, balance: user.balance, createdAt: user.createdAt });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (bio) updates.profile = { bio };

    const user = await firestoreService.updateUser(req.user.id, updates);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ id: user.id, username: user.username, email: user.email, isCreator: user.isCreator, balance: user.balance });

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
app.get('/api/events', async (req, res) => {
  try {
    if (useFirestore) {
      const eventsList = await firestoreService.getEvents();
      return res.json({ events: eventsList, total: eventsList.length });
    }
    res.json({ events, total: events.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/events/live', async (req, res) => {
  try {
    if (useFirestore) {
      const liveEvents = await firestoreService.getLiveEvents();
      return res.json({ events: liveEvents, total: liveEvents.length });
    }
    const liveEvents = events.filter(e => e.live);
    res.json({ events: liveEvents, total: liveEvents.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/events', verifyToken, async (req, res) => {
  try {
    const { title, category, datetime, type, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const user = await firestoreService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Host user not found' });


    if (useFirestore) {
      const event = await firestoreService.createEvent({
        title,
        host: user.username || 'Anonymous',
        hostId: req.user.id,
        category: category || 'general',
        datetime: datetime || new Date().toISOString(),
        type: type || 'Free',
        price: price || 0
      });
      io?.emit?.('new-event', event);
      return res.json(event);
    }

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

app.delete('/api/events/:id', verifyToken, async (req, res) => {
  try {
    const event = await firestoreService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.hostId !== req.user.id) return res.status(403).json({ error: 'Not authorised to delete this event' });
    await firestoreService.deleteEvent(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Member Directory + Announcements ────────────────

app.get('/api/directory', async (req, res) => {
  try {
    if (useFirestore) {
      const users = await firestoreService.getDirectory();
      return res.json({ users });
    }
    const users = await User.find().select('username isCreator').limit(200);
    res.json({ users: users.map(u => ({ id: u._id, username: u.username, isCreator: u.isCreator })) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/announcements', async (req, res) => {
  try {
    if (useFirestore) {
      const announcements = await firestoreService.getAnnouncements();
      return res.json({ announcements });
    }
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(100);
    res.json({ announcements });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/announcements', verifyToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

    const user = await firestoreService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });


    if (useFirestore) {
      const ann = await firestoreService.createAnnouncement({
        title,
        body,
        author: user.username || 'Unknown',
        authorId: req.user.id
      });
      return res.json({ announcement: ann });
    }

    const ann = await Announcement.create({
      title: String(title).slice(0, 80),
      body: String(body).slice(0, 2000),
      author: user?.username || 'Unknown',
      authorId: req.user.id
    });

    res.json({ announcement: ann });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Leaderboard ────────────────────────────────────

app.get('/api/leaderboard', async (req, res) => {
  try {
    if (useFirestore) {
      const topTippers = await firestoreService.getLeaderboard();
      return res.json({ topTippers });
    }
    const topTippers = await User.find().sort({ totalTipped: -1 }).limit(10).select('username totalTipped');
    res.json({ topTippers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Rooms ──────────────────────────────────────────
app.post('/api/rooms', verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (useFirestore) {
      const room = await firestoreService.createRoom({ name, description, creatorId: req.user.id });
      return res.json(room);
    }
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
    if (useFirestore) {
      const list = await firestoreService.getRooms();
      return res.json({ rooms: list, total: list.length });
    }
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
    socket.on('auth', async (token) => {
      try {
        const auth = getAuth();
        if (!auth) throw new Error('Firebase Auth not initialized');
        const decodedToken = await auth.verifyIdToken(token);
        const user = await firestoreService.findUserById(decodedToken.uid);
        if (!user) throw new Error('User not found in database');
        
        socketUsers.set(socket.id, { id: user.id, username: user.username });
        socket.emit('auth-ok', { username: user.username });
      } catch (err) {
        console.error('Socket auth error:', err.message);
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
      const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
      const msg = { username: user.username, message, timestamp: new Date().toISOString(), socketId: socket.id };
      io.to(roomId).emit('chat-message', msg);
      await firestoreService.addRoomChatMessage(roomId, msg);
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
    const fromUserDoc = await firestoreService.findUserById(socketUsers.get(socket.id)?.id);
    const toUserDoc = await firestoreService.findUserById(creatorId);

        if (!fromUserDoc || !toUserDoc) {
          return socket.emit('error', 'User not found');
        }
        const currentBalance = Number(fromUserDoc.balance || 0);
        const tipAmount = Number(amount || 0);
        if (currentBalance >= tipAmount && tipAmount > 0) {
          await firestoreService.changeUserBalance(fromUserDoc.id, -tipAmount);
          await firestoreService.changeUserBalance(toUserDoc.id, tipAmount);
          await firestoreService.incrementRoomTips(roomId, tipAmount);
          io.to(roomId).emit('tip-received', { from: fromUserDoc.username, amount: tipAmount, creatorId });
          socket.emit('tip-sent', { amount: tipAmount, newBalance: currentBalance - tipAmount });

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

async function startService() {
  const initResult = initializeFirebase();
  if (!initResult.initialized) {
    console.error('❌ Firebase is not initialized. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT, or GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }

  console.log('✅ Using Firestore as the primary data store');

  if (require.main === module && server) {
    server.listen(PORT, () => {
      console.log(`
🍺 ===================================
   DotsBar Server Running!
   http://localhost:${PORT}
   using Firestore: true
🍺 ===================================
      `);
    });
  }
}

startService();

// ── 404 Handler for API routes ────────────────────
// Return JSON for API paths to keep frontend `res.json()` from failing.
app.use('/api/*', (req, res) => {
  // Helpful in production debugging (harmless)
  console.warn('[API 404]', req.method, req.originalUrl);
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});


// ── 404 Fallback for frontend ──────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.server = server;
app.io = io;
module.exports = app;
