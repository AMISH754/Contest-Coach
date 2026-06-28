import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Contest Coach server is healthy' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Contest Coach Server running on http://localhost:${PORT}`);
  console.log(`🔒 Allowed CORS Origin: ${FRONTEND_URL}`);
});
