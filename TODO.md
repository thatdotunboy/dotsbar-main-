# TODO

- [x] Remove marketplace/virtual drinks/NFT/metaverse/social networking references from frontend navigation and pages.
- [x] Delete `frontend/marketplace.html`.
- [x] Remove `/api/products` endpoint and in-memory `products` (including NFT collectibles) from `backend/server.js`.
- [x] Remove `frontend/bar.html` links/sections that point to `marketplace.html`.
- [x] Update `frontend/index.html` to replace the “Shop”/marketplace pill with Community Hub.
- [x] Add Community Hub page (`frontend/community.html`) and wire it into nav + landing.
- [x] Add Member Directory page (`frontend/directory.html`) and wire it into nav + Community Hub.
- [x] Add Announcements page (`frontend/announcements.html`) and wire it into nav + Community Hub.
- [x] Implement backend endpoints for announcements and member directory (minimal, read-only list + simple create for announcements).
- [ ] Quick smoke test: load each kept feature page and verify no broken links.

## MVP v1.0 (PRD Alignment) — Implementation Tasks

### 1) Community Creation (backend first)
- [ ] Add Firestore collections for communities + memberships + invites
- [ ] Implement `POST /api/communities` (create community)
- [ ] Implement `GET /api/communities` (list)
- [ ] Implement `GET /api/communities/:id` (details)
- [ ] Implement `POST /api/communities/:id/invite` (invite token/link)
- [ ] Implement `POST /api/communities/:id/join` (join public/private/invite-only)


### 2) Event Creation + RSVP + Attendance (backend first)
- [ ] Extend Firestore event schema for RSVP + attendance state
- [ ] Implement `POST /api/events/:id/rsvp`
- [ ] Implement `POST /api/events/:id/check-in`
- [ ] Implement `GET /api/events/:id/attendance`

### 3) Member Management + Roles (backend first)
- [ ] Implement role-aware membership endpoints:
  - [ ] `GET /api/communities/:id/members`
  - [ ] `POST /api/communities/:id/members/:userId/role`
  - [ ] `POST /api/communities/:id/members/:userId/remove`
  - [ ] `POST /api/communities/:id/members/:userId/ban`

### 4) Livestreaming + Live Chat (wire PRD MVP)
- [ ] Bind streams to community/event sessions instead of simulated viewer count
- [ ] Ensure Socket.IO join/leave updates viewer count accurately
- [ ] Wire stream host controls to server-side live state
- [ ] Keep chat as socket channel with HTML escaping

### 5) Frontend wiring
- [ ] Update `frontend/community.html` to create/join communities
- [ ] Update `frontend/events.html` to replace mocked RSVP with real RSVP endpoint
- [ ] Update `frontend/directory.html` to be community-scoped when applicable
- [ ] Update `frontend/stream.html` to use real viewer counts and correct creatorId/tipping

### 6) Auth consistency
- [ ] Verify frontend auth flow matches backend:
  - [ ] Ensure `/api/auth/login` and `/api/auth/register` exist OR remove their usage
  - [ ] Prefer Firebase auth + `/api/auth/sync` if that’s the intended flow

### 7) Verification
- [ ] Run local smoke test: community create -> invite -> join
- [ ] Create event -> RSVP -> attendance check-in
- [ ] Start stream -> viewers join -> chat + reactions work

