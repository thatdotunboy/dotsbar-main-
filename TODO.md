# TODO

## Room tipping fix (creatorId end-to-end)
- [x] Update `backend/server.js` GET `/api/rooms` to include `creatorId` in response.
- [x] Update `frontend/rooms.js` to store active room's `creatorId` on `enterRoom()`.
- [x] Update tip handler in `frontend/rooms.js` to emit `tip` with `{ roomId, amount, creatorId }`.
- [x] Validate tip UI no longer blocks.
- [ ] Smoke test: start server, load `/rooms.html`, tip creator, verify balance updates.




