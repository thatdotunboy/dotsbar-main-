# DotsBar

A Firestore-backed live community platform built with Express, Socket.io, and Firebase.

- **Backend**: `backend/server.js`
- **Frontend**: static files in `frontend/`
- **Database**: Firebase Firestore
- **Deploy**: local Node.js server; Vercel serverless is not suitable for Socket.io realtime connections.

## Local development

1. Copy `.env.example` to `.env` and fill in your keys.
2. Provide Firebase credentials via `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_SERVICE_ACCOUNT`, or `GOOGLE_APPLICATION_CREDENTIALS`.
3. Run:

```bash
npm install
npm start
```
