import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

// Initialize the Socket.io server attached to the HTTP server with CORS enabled
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*' }, // relaxed for demo/testing purposes
  });

  // Runs once per new client connection.
  io.on('connection', (socket: Socket) => {
    // Extract the JWT authentication token from the handshake auth payload
    const token = socket.handshake.auth?.token as string | undefined;

    // Disconnect the socket immediately if no token is provided
    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      // Verify the JWT token and extract user information
      const payload = verifyToken(token);
      // Every socket for this user joins a room named after their user id.
      socket.join(`user:${payload.userId}`);
      console.log(`Socket connected for user ${payload.userId}`);
    } catch {
      // Bad/expired token, reject the connection by disconnecting.
      socket.disconnect();
    }
  });

  return io;
}

// Called from other parts of the app whenever we want to push
// a real-time event to one specific user.
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return; // socket server not initialised (e.g. during tests)
  io.to(`user:${userId}`).emit(event, data);
}