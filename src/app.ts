import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Initialize the Express application instance
const app = express();

// Enable CORS to allow cross-origin requests from frontend clients
app.use(cors());          // allow requests from other origins
// Parse incoming JSON request bodies into req.body objects
app.use(express.json());  // parse incoming JSON request bodies into req.body

// Health check endpoint for monitoring container and server uptime status
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount all core API routers under the /api path prefix
app.use('/api', apiRoutes);

// Register 404 route catcher and centralized error handling middleware pipelines
app.use(notFoundHandler);
app.use(errorHandler);

export default app;