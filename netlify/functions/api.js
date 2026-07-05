const serverless = require('serverless-http');
const app = require('../../server'); // Import the express app from server.js

// Wrap the Express app for Serverless
module.exports.handler = serverless(app);
