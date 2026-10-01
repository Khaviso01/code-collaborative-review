import dotenv from 'dotenv';

// Load environment variables from the .env file into process.env before initializing services
dotenv.config();

import http from 'http';
import app from './app';
import { initSocket } from './websocket/socket';

// Determine the port from environment variables or fall back to default port 4001
const PORT = process.env.PORT || 4001;

// Create the raw HTTP server wrapping the Express application instance
const httpServer = http.createServer(app);

// Initialize the real-time Socket.io server attached to the HTTP server
initSocket(httpServer);

// Start listening for incoming HTTP and WebSocket connections on the designated port
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`REST API base:   http://localhost:${PORT}/api`);
  console.log(`WebSocket ready on the same port.`);
});