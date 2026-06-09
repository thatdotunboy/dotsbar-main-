const fs = require('fs');
const admin = require('firebase-admin');

let firestore = null;
let auth = null;

function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (filePath && fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  return null;
}

function initializeFirebase() {
  if (admin.apps.length) {
    firestore = admin.firestore();
    auth = admin.auth();
    return { firestore, auth, initialized: Boolean(firestore) };
  }

  const serviceAccount = loadServiceAccount();
  const useDefaultCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!serviceAccount && !useDefaultCredentials) {
    console.warn('⚠️ Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT, or GOOGLE_APPLICATION_CREDENTIALS.');
    return { firestore: null, auth: null, initialized: false };
  }

  try {
    const options = {};

    if (serviceAccount) {
      options.credential = admin.credential.cert(serviceAccount);
    } else {
      options.credential = admin.credential.applicationDefault();
    }

    admin.initializeApp(options);
    firestore = admin.firestore();
    auth = admin.auth();
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }

  return { firestore, auth, initialized: Boolean(firestore) };
}

function getFirestore() {
  return firestore;
}

function getAuth() {
  return auth;
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth
};
