const admin = require('firebase-admin');
const { getFirestore } = require('./firebase');

const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  ANNOUNCEMENTS: 'announcements',
  ROOMS: 'rooms'
};

function getDb() {
  const firestore = getFirestore();
  if (!firestore) throw new Error('Firestore is not initialized');
  return firestore;
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isCreator: user.isCreator || false,
    balance: user.balance || 0,
    totalTipped: user.totalTipped || 0,
    profile: user.profile || {},
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    password: user.password
  };
}

function normalizeDoc(doc) {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function findUserByEmail(email) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.USERS)
    .where('email', '==', String(email).toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return normalizeUser({ id: doc.id, ...doc.data() });
}

async function findUserById(id) {
  const firestore = getDb();
  const doc = await firestore.collection(COLLECTIONS.USERS).doc(String(id)).get();
  if (!doc.exists) return null;
  return normalizeUser({ id: doc.id, ...doc.data() });
}

async function createUser({ id, username, email, isCreator = false, balance = 0, totalTipped = 0 }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const data = {
    username: String(username),
    email: String(email).toLowerCase(),
    isCreator: Boolean(isCreator),
    balance: Number(balance) || 0,
    totalTipped: Number(totalTipped) || 0,
    profile: {},
    createdAt: now,
    updatedAt: now
  };
  const ref = firestore.collection(COLLECTIONS.USERS).doc(String(id));
  await ref.set(data);
  return normalizeUser({ id: ref.id, ...data });
}

async function updateUser(id, update) {
  const firestore = getDb();
  const ref = firestore.collection(COLLECTIONS.USERS).doc(String(id));
  update.updatedAt = new Date().toISOString();
  await ref.update(update);
  const doc = await ref.get();
  return normalizeUser({ id: doc.id, ...doc.data() });
}

async function changeUserBalance(id, delta) {
  const firestore = getDb();
  const ref = firestore.collection(COLLECTIONS.USERS).doc(String(id));
  await ref.update({
    balance: admin.firestore.FieldValue.increment(delta),
    updatedAt: new Date().toISOString()
  });
  const doc = await ref.get();
  return normalizeUser({ id: doc.id, ...doc.data() });
}

async function createEvent({ title, host, hostId, category, datetime, type, price }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const data = {
    title: String(title),
    host: String(host),
    hostId: String(hostId),
    category: String(category || 'general'),
    datetime: new Date(datetime || now).toISOString(),
    type: String(type || 'Free'),
    price: Number(price || 0),
    viewers: 0,
    live: false,
    createdAt: now,
    updatedAt: now
  };
  const ref = firestore.collection(COLLECTIONS.EVENTS).doc();
  await ref.set(data);
  return normalizeDoc({ id: ref.id, ...data, exists: true });
}

async function getEvents() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.EVENTS).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => normalizeDoc(doc));
}

async function getLiveEvents() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.EVENTS).where('live', '==', true).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => normalizeDoc(doc));
}

async function getEventById(id) {
  const firestore = getDb();
  const doc = await firestore.collection(COLLECTIONS.EVENTS).doc(String(id)).get();
  if (!doc.exists) return null;
  return normalizeDoc(doc);
}

async function deleteEvent(id) {
  const firestore = getDb();
  await firestore.collection(COLLECTIONS.EVENTS).doc(String(id)).delete();
  return true;
}

async function createAnnouncement({ title, body, author, authorId }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const data = {
    title: String(title).slice(0, 80),
    body: String(body).slice(0, 2000),
    author: String(author || 'Unknown'),
    authorId: String(authorId || ''),
    createdAt: now,
    updatedAt: now
  };
  const ref = firestore.collection(COLLECTIONS.ANNOUNCEMENTS).doc();
  await ref.set(data);
  return normalizeDoc({ id: ref.id, ...data, exists: true });
}

async function getAnnouncements() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.ANNOUNCEMENTS).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => normalizeDoc(doc));
}

async function getDirectory() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.USERS).limit(200).get();
  return snapshot.docs.map((doc) => {
    const user = doc.data();
    return { id: doc.id, username: user.username, isCreator: user.isCreator || false };
  });
}

async function getLeaderboard() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.USERS)
    .orderBy('totalTipped', 'desc')
    .limit(10)
    .get();
  return snapshot.docs.map((doc) => {
    const user = doc.data();
    return { id: doc.id, username: user.username, totalTipped: user.totalTipped || 0 };
  });
}

async function createRoom({ name, description, creatorId }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const data = {
    name: String(name),
    description: String(description || ''),
    creatorId: String(creatorId),
    viewers: [],
    chatMessages: [],
    tipsTotal: 0,
    createdAt: now,
    updatedAt: now
  };
  const ref = firestore.collection(COLLECTIONS.ROOMS).doc();
  await ref.set(data);
  return normalizeDoc({ id: ref.id, ...data, exists: true });
}

async function getRooms() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.ROOMS).orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => normalizeDoc(doc));
}

async function getRoomById(id) {
  const firestore = getDb();
  const doc = await firestore.collection(COLLECTIONS.ROOMS).doc(String(id)).get();
  if (!doc.exists) return null;
  return normalizeDoc(doc);
}

async function addRoomChatMessage(roomId, message) {
  const firestore = getDb();
  const ref = firestore.collection(COLLECTIONS.ROOMS).doc(String(roomId));
  await ref.update({
    chatMessages: admin.firestore.FieldValue.arrayUnion(message),
    updatedAt: new Date().toISOString()
  });
}

async function incrementRoomTips(roomId, amount) {
  const firestore = getDb();
  const ref = firestore.collection(COLLECTIONS.ROOMS).doc(String(roomId));
  await ref.update({
    tipsTotal: admin.firestore.FieldValue.increment(Number(amount) || 0),
    updatedAt: new Date().toISOString()
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  changeUserBalance,
  createEvent,
  getEvents,
  getLiveEvents,
  createAnnouncement,
  getAnnouncements,
  getDirectory,
  getLeaderboard,
  createRoom,
  getRooms,
  getRoomById,
  addRoomChatMessage,
  incrementRoomTips
};
