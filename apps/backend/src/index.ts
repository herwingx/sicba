import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
// Se usará el cliente importado desde nuestro monorepo
import { prisma } from '@sicba/database';

import authRoutes from './routes/auth';
import questionsRoutes from './routes/questions';
import examRoutes from './routes/exams';
import subjectsRoutes from './routes/subjects';
import usersRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import statsRoutes from './routes/stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/// Middlewares base para seguridad y compresión
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

/**
 * Endpoint de prueba de salud de la API.
 * Implementé esto para que podamos verificar rápidamente que el backend y la BD están vivos.
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Validamos conexión a BD
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
