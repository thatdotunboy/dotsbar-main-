# DotsBar Product Backlog

## Release 1: Core Platform

### Epic: Persistence and Stability
- **DB-001** Persist rooms in MongoDB
  - As a user, I want rooms to survive server restarts so I can rejoin existing sessions.
  - Acceptance: `POST /api/rooms` writes to MongoDB, `GET /api/rooms` returns persisted rooms, room metadata includes `creatorId`.
- **DB-002** Persist room chat history
  - As a participant, I want chat messages saved so I can see recent room discussion after refresh.
  - Acceptance: chat messages are saved in DB and returned when room is loaded.
- **DB-003** Persist events and products
  - As an operator, I want events and marketplace items stored in the database.
  - Acceptance: event and product data are no longer hard-coded in memory.

### Epic: Authentication and validation
- **AUTH-001** Enforce environment secrets
  - As an operator, I want the app to fail startup if `JWT_SECRET` is missing.
  - Acceptance: app refuses to start without required env variables.
- **AUTH-002** Add request validation
  - As a developer, I want schema validation for all API payloads.
  - Acceptance: invalid payloads return `400` with clear errors.
- **AUTH-003** Secure login/register flow
  - As a user, I want secure password hashing and JWT auth.
  - Acceptance: passwords are stored hashed, login returns valid JWT.

### Epic: Testing and quality
- **QA-001** Add Jest test suite
  - As a developer, I want test coverage for auth and room APIs.
  - Acceptance: tests for register, login, room creation, and tipping pass.
- **QA-002** Add CI test script
  - As a team, we want tests to run automatically on push.
  - Acceptance: `npm test` runs in CI.

## Release 2: Real-Time Experience

### Epic: Room presence and Socket.io quality
- **RT-001** Accurate room viewer counts
  - As a user, I want viewer counts that update when people join or leave.
  - Acceptance: `viewer-count` events broadcast correctly.
- **RT-002** Clean socket lifecycle
  - As a developer, I want socket state cleaned on disconnect.
  - Acceptance: disconnected sockets are removed from active room sets.
- **RT-003** Room creator data in response
  - As a user, I want to see creator names for rooms.
  - Acceptance: room list includes creator username and creatorId.

### Epic: WebRTC voice/video
- **RTC-001** TURN/STUN support
  - As a participant, I want my audio/video connection to work across networks.
  - Acceptance: app uses TURN/STUN configuration in `rtcConfig`.
- **RTC-002** Remote stream cleanup
  - As a participant, I want remote streams removed when users leave.
  - Acceptance: remote video elements are removed on `user-left`.
- **RTC-003** Mute/unmute controls
  - As a participant, I want to mute and unmute myself.
  - Acceptance: local audio track toggles on button press.

### Epic: Secure chat
- **CHAT-001** Sanitize incoming chat
  - As a user, I want chat messages to not execute HTML.
  - Acceptance: all chat messages are escaped before rendering.
- **CHAT-002** Persist chat for rooms
  - As a user, I want to see recent messages if I refresh.
  - Acceptance: API returns recent chat messages for the room.

## Release 3: Monetization

### Epic: Wallet and tipping
- **PAY-001** Add Stripe wallet top-up
  - As a user, I want to buy DotsCoins with real money.
  - Acceptance: checkout session created, webhook credits user balance.
- **PAY-002** Real tip transfers
  - As a fan, I want tip payments to debit my balance and credit the creator.
  - Acceptance: tip transaction persists and updates both balances.
- **PAY-003** Tip failure handling
  - As a user, I want a clear error when my balance is insufficient.
  - Acceptance: server returns error and client displays it.

### Epic: Marketplace checkout
- **SHOP-001** DB-backed product catalog
  - As a shopper, I want products to come from the database.
  - Acceptance: product list is loaded from MongoDB.
- **SHOP-002** Purchase flow
  - As a customer, I want to buy a product and see order history.
  - Acceptance: purchase endpoint processes order and records it.
- **SHOP-003** Admin product management
  - As an admin, I want to add and edit marketplace items.
  - Acceptance: admin endpoints exist for CRUD on products.

## Release 4: Scale and operations

### Epic: Scalability
- **SCALE-001** Redis Socket.io adapter
  - As an operator, I want the app to work across multiple node instances.
  - Acceptance: Socket.io uses Redis adapter and broadcasts across processes.
- **SCALE-002** Health checks
  - As a platform owner, I want a health endpoint.
  - Acceptance: `/health` reports service and DB status.

### Epic: Monitoring and load testing
- **OPS-001** Add basic metrics
  - As an operator, I want counts of active sockets and request latency.
  - Acceptance: metrics are exposed or logged.
- **OPS-002** Load test benchmark
  - As a team, I want documented performance under load.
  - Acceptance: load-test report exists for 100/500/1000 concurrent clients.

## Release 5: UX and growth

### Epic: UI polish
- **UX-001** Responsive rooms pages
  - As a mobile user, I want room pages to work on small screens.
  - Acceptance: room list and chat UI are usable on mobile.
- **UX-002** Feedback and notifications
  - As a user, I want clear success and error notifications.
  - Acceptance: toast or UI alerts appear for actions.

### Epic: Live sports and discovery
- **GROWTH-001** Live match widget
  - As a fan, I want live sports scores in the app.
  - Acceptance: `/api/matches` returns provider data with fallback support.
- **GROWTH-002** Creator discovery
  - As a new user, I want featured and premium rooms surfaced.
  - Acceptance: room filter UI or label for creators/premium rooms.

## Implementation Notes
- Prefer `backend/server-dotun.js` logic only after deduplication; choose one backend entrypoint.
- Use MongoDB models for users, rooms, products, events, and transactions.
- Keep Socket.io state minimal and rely on DB/Redis for authoritative values.
- Add `.env.example` and document required environment variables.
- Place tests in `__tests__` and configure Jest in `package.json`.

## Suggested Sprint Order
1. P1 persistence + validation
2. P2 Socket.io/room reliability
3. P3 Stripe wallet and tips
4. P4 Redis scaling + health checks
5. P5 UX polish + sports content
