import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/subjects — Listar todas las materias
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    return res.json(subjects);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las materias.' });
  }
});

// POST /api/subjects — Crear materia (Admin)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'Solo administradores pueden crear materias.' });
  }

  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });

  try {
    const subject = await prisma.subject.create({ data: { name, description } });
    return res.status(201).json(subject);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear la materia.' });
  }
});

export default router;
