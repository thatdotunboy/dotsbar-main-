# DotsBar Technical Specification

## 1. Purpose

This document defines the prioritized technical specification for the DotsBar project. It is intended to convert the existing prototype into a production-ready social platform with real-time room experiences, marketplace monetization, and operational stability.

## 2. Product Vision

DotsBar is a live social bar experience where users can:
- create and join rooms for chat and voice interaction,
- browse and purchase virtual goods,
- tip content creators,
- follow live sports and events,
- maintain persistent accounts and wallet balances.

The product must feel trustworthy, scalable, and ready for creator monetization.

## 3. Scope

### Included
- User authentication and authorization
- Persistent rooms and chat state
- Socket.io real-time room join/leave, chat, tipping
- WebRTC-based voice/video room participation
- Marketplace product listings and creator tip flow
- Stripe wallet top-up flow
- Basic operational observability and health checks

### Out of scope for MVP
- NFT minting and marketplace integration
- Advanced admin dashboards
- Full mobile app experience beyond responsive web
- Multi-tenant enterprise architecture

## 4. Prioritized milestones

### Priority 1: Core stability and persistence

#### P1.1 Persist rooms and events
- Store rooms in MongoDB instead of memory.
- Include `creatorId`, `viewerCount`, `tipsTotal`, and `createdAt`.
- Persist event metadata and keep it available after restart.
- Return creator usernames and room counts in `GET /api/rooms`.

#### P1.2 Harden auth and request validation
- Require `JWT_SECRET` in environment and fail startup if absent.
- Add validation for `register`, `login`, `profile`, `rooms`, `events`, and `tip` endpoints.
- Reject invalid payloads with descriptive `400` responses.

#### P1.3 Add automated tests
- Add Jest and Supertest.
- Test auth, room creation, room listing, and tipping behavior.
- Add a CI script to run tests on each push.

#### P1.4 Enforce configuration safety
- Create `.env.example` with required env variables.
- Remove insecure default secrets from source.
- Document required env values in README.

### Priority 2: Real-time room quality

#### P2.1 Improve room lifecycle and presence
- Ensure `join-room`/`leave-room` update active room counts.
- Emit room presence events consistently.
- Clean up inactive sockets and peer connections.

#### P2.2 Implement robust WebRTC voice/video
- Use TURN/STUN servers in `rtcConfig`.
- Ensure remote streams are attached and removed properly.
- Add mute/unmute controls.
- Support discovery of participants and active speaker notifications.

#### P2.3 Secure chat experience
- Sanitize all chat messages server-side.
- Escape text before rendering in the browser.
- Persist chat log at least during room lifetime.

### Priority 3: Monetization and economy

#### P3.1 Add Stripe wallet flow
- Add server endpoint to create Stripe checkout sessions.
- Add webhook endpoint to credit user wallet after payment.
- Add balance field to user model and persist wallet transactions.

#### P3.2 Make tipping real
- Deduct tip amounts from sender balance.
- Add creator balance and tally total tipped amounts.
- Persist tip events in DB.
- Emit success/failure responses for tip actions.

#### P3.3 Marketplace checkout
- Move marketplace products to MongoDB.
- Add product CRUD and optional admin controls.
- Add purchase endpoint and order history.

### Priority 4: Scalability and operations

#### P4.1 Redis-backed Socket.io scaling
- Configure Socket.io Redis adapter for multi-instance support.
- Use Redis for shared room presence if expected to scale.

#### P4.2 Metrics and health checks
- Add `/health` or `/healthz` endpoint.
- Add basic metrics for active sockets, HTTP latency, and DB connectivity.
- Add a Docker healthcheck in `Dockerfile` or `docker-compose`.

#### P4.3 Load-testing and performance baseline
- Run load tests using `autocannon` or `artillery`.
- Document concurrent user performance and bottlenecks.

### Priority 5: UX polish and growth features

#### P5.1 Responsive modern UI
- Improve room and marketplace page layout for mobile.
- Make onboarding and tip actions obvious.
- Add error and success feedback.

#### P5.2 Live sports integration
- Ensure `/api/matches` uses real API data.
- Use fallback only when provider fails.
- Display league, score, status, and viewers.

#### P5.3 Creator discovery and premium rooms
- Add room tagging for creator rooms.
- Mark premium or featured rooms.
- Support room filters and search.

## 5. Exact user stories

### User stories for Release 1
- As a new user, I want to register with an email and password so I can log in securely.
- As a returning user, I want to log in and view my current balance so I can join rooms.
- As a creator, I want to create a room and see it in the room list so fans can join.
- As a user, I want to join a room and participate in chat so I can interact with others.
- As a user, I want room data to still be available after the server restarts.
- As a user, I want a failure message when I try to create a room with invalid input.

### User stories for Release 2
- As a user, I want to tip the creator of a room using my wallet balance.
- As a creator, I want tip income to be added to my balance.
- As a customer, I want to browse bar products and purchase a drink or merch item.
- As a user, I want to top up my wallet with real money using Stripe.

### User stories for Release 3
- As a participant, I want the room voice/video stream to work so I can communicate live.
- As a user, I want to see the current viewer count in each room.
- As a user, I want to see live sports matches and scores inside the app.
- As a creator, I want my room to be discoverable as featured or premium.

## 6. Development plan

### Phase 0: Discovery and preparation
- Review current code and remove duplicate backend variants.
- Finalize DB schema for users, rooms, products, tips, and transactions.
- Create `.env.example`.
- Define API contract for auth, rooms, products, and wallet endpoints.
- Duration: 1 week.

### Phase 1: Foundation MVP
- Persist rooms and room metadata in MongoDB.
- Add request validation and auth checks.
- Migrate product catalog to DB.
- Add Jest/Supertest coverage for critical routes.
- Duration: 2 weeks.

### Phase 2: Real-time polish
- Harden Socket.io room lifecycle.
- Add TURN/STUN and WebRTC reliability improvements.
- Add chat sanitization and history persistence.
- Duration: 2-3 weeks.

### Phase 3: Monetization
- Add Stripe wallet top-up flow and payment webhook.
- Implement tip accounting and transaction persistence.
- Add marketplace purchase flow and order history.
- Duration: 2-3 weeks.

### Phase 4: Scale and operations
- Add Redis Socket.io adapter.
- Add `/health` endpoint and metrics.
- Create CI pipeline for lint and tests.
- Run load-testing and document results.
- Duration: 2 weeks.

### Phase 5: Product polish
- Improve responsive UI and mobile usability.
- Add creator discovery, premium rooms, and filters.
- Improve marketplace experience and notifications.
- Duration: 2 weeks.

## 7. Acceptance criteria

- All critical API routes are covered by tests.
- Room creation and listing survive service restart.
- Tipping deducts from sender and credits creator.
- Wallet top-up is implemented with Stripe.
- Socket.io room counts and join/leave events are accurate.
- `/health` returns healthy status and DB connection status.
- Live match endpoint returns provider data with fallback.
- Frontend works on desktop and mobile.

## 8. Delivery checklist

- [ ] Create technical specification and align on milestones.
- [ ] Persist room and event state.
- [ ] Add request validation and env safety.
- [ ] Add test suite and CI script.
- [ ] Harden Socket.io and WebRTC.
- [ ] Add Stripe wallet flow.
- [ ] Add Redis support for scaling.
- [ ] Improve responsive UI and live event content.

---

## 9. Notes

This specification intentionally keeps the roadmap narrow enough for a deliverable MVP while preserving the platform’s future monetization potential.
