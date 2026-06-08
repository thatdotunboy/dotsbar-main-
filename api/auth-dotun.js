// Disabled: this project runs as a single Express+Socket.io server (backend/server.js).
module.exports = (req, res) => res.status(404).json({ error: 'Disabled' });

