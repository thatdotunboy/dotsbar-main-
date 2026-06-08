// api/index.js
// This file turns the existing Express app into a Vercel Serverless Function.

const { app } = require('../backend/server');

module.exports = app;
