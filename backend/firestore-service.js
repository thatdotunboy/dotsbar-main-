const admin = require('firebase-admin');
const { getFirestore } = require('./firebase');

const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  ANNOUNCEMENTS: 'announcements',
  ROOMS: 'rooms',
  COMMUNITIES: 'communities',
  COMMUNITY_MEMBERS: 'communityMembers',
  COMMUNITY_INVITES: 'communityInvites'
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

// ── Community CRUD / Membership / Invites (Firestore MVP) ────────────────

function safeString(val) {
  return String(val ?? '').trim();
}

async function createCommunity({ name, description, logoUrl, bannerUrl, category = 'general', privacy = 'public', creatorId }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const data = {
    name: safeString(name),
    description: safeString(description),
    logoUrl: safeString(logoUrl),
    bannerUrl: safeString(bannerUrl),
    category: safeString(category) || 'general',
    privacy: privacy || 'public',
    createdBy: String(creatorId),
    createdAt: now,
    updatedAt: now,
  };
  const ref = firestore.collection(COLLECTIONS.COMMUNITIES).doc();
  await ref.set(data);
  return normalizeDoc({ id: ref.id, ...data, exists: true });
}

async function getCommunities() {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITIES)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  const list = snapshot.docs.map((doc) => normalizeDoc(doc));
  return Promise.all(
    list.map(async (c) => {
      const creator = c.createdBy ? await findUserById(c.createdBy) : null;
      return { ...c, creatorUsername: creator?.username || 'Unknown' };
    })
  );
}

async function getCommunityById(id) {
  const firestore = getDb();
  const doc = await firestore.collection(COLLECTIONS.COMMUNITIES).doc(String(id)).get();
  if (!doc.exists) return null;
  const c = normalizeDoc(doc);
  const creator = c.createdBy ? await findUserById(c.createdBy) : null;
  return { ...c, creatorUsername: creator?.username || 'Unknown' };
}

async function upsertCommunityMember({ communityId, userId, role = 'member' }) {
  const firestore = getDb();
  const now = new Date().toISOString();
  const ref = firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .doc();

  // Ensure uniqueness by querying existing membership; keep simple for MVP.
  const existing = await firestore
    .collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('userId', '==', String(userId))
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS).doc(doc.id).update({
      role,
      banned: false,
      joinedAt: doc.data().joinedAt || now,
      updatedAt: now,
    });
    return { id: doc.id, ...doc.data(), role };
  }

  const data = {
    communityId: String(communityId),
    userId: String(userId),
    role: role || 'member',
    joinedAt: now,
    updatedAt: now,
    banned: false,
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getCommunityMembers({ communityId, limit = 200 }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('banned', '==', false)
    .limit(limit)
    .get();

  const members = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return Promise.all(
    members.map(async (m) => {
      const u = await findUserById(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        username: u?.username || 'Unknown',
        role: m.role || 'member',
        joinedAt: m.joinedAt || null,
      };
    })
  );
}

async function setCommunityMemberRole({ communityId, targetUserId, role }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('userId', '==', String(targetUserId))
    .limit(1)
    .get();

  if (snapshot.empty) return false;
  const doc = snapshot.docs[0];
  await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS).doc(doc.id).update({ role, updatedAt: new Date().toISOString() });
  return true;
}

async function removeCommunityMember({ communityId, targetUserId }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('userId', '==', String(targetUserId))
    .limit(1)
    .get();

  if (snapshot.empty) return false;
  const doc = snapshot.docs[0];
  await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS).doc(doc.id).delete();
  return true;
}

async function banCommunityMember({ communityId, targetUserId }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('userId', '==', String(targetUserId))
    .limit(1)
    .get();

  if (snapshot.empty) return false;
  const doc = snapshot.docs[0];
  await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS).doc(doc.id).update({
    banned: true,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

async function getCommunityMemberRole({ communityId, userId }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_MEMBERS)
    .where('communityId', '==', String(communityId))
    .where('userId', '==', String(userId))
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  if (doc.data().banned) return null;
  return doc.data().role || 'member';
}

async function createCommunityInvite({ communityId, creatorId, role = 'member', expiresAtMs = 7 * 24 * 60 * 60 * 1000 }) {
  const firestore = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresAtMs);
  const token = `${String(communityId).slice(0, 6)}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

  const data = {
    communityId: String(communityId),
    token,
    role: role || 'member',
    createdBy: String(creatorId),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
  };
  const ref = firestore.collection(COLLECTIONS.COMMUNITY_INVITES).doc();
  await ref.set(data);
  return normalizeDoc({ id: ref.id, ...data, exists: true });
}

async function consumeCommunityInvite({ communityId, token }) {
  const firestore = getDb();
  const snapshot = await firestore.collection(COLLECTIONS.COMMUNITY_INVITES)
    .where('communityId', '==', String(communityId))
    .where('token', '==', String(token))
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  if (data.usedAt) return null;
  if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) return null;
  await firestore.collection(COLLECTIONS.COMMUNITY_INVITES).doc(doc.id).update({ usedAt: new Date().toISOString() });
  return { id: doc.id, ...data };
}

async function joinCommunityViaInvite({ communityId, userId, token }) {
  const invite = await consumeCommunityInvite({ communityId, token });
  if (!invite) return { ok: false, error: 'Invalid or expired invite token' };
  await upsertCommunityMember({ communityId, userId, role: invite.role || 'member' });
  return { ok: true, invite };
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
  incrementRoomTips,

  // Communities
  createCommunity,
  getCommunities,
  getCommunityById,
  createCommunityInvite,
  joinCommunityViaInvite,
  upsertCommunityMember,
  getCommunityMembers,
  getCommunityMemberRole,
  setCommunityMemberRole,
  removeCommunityMember,
  banCommunityMember,
};

