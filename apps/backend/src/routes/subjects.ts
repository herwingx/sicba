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

// PATCH /api/subjects/:id — Editar materia (Admin)
router.patch('/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { role } = (req as any).user;
  if (role !== 'ADMIN' && role !== 'MAESTRO') return res.status(403).json({ error: 'No autorizado.' });

  try {
    const { name, description } = req.body;
    const subject = await prisma.subject.update({ where: { id }, data: { name, description } });
    return res.json(subject);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar la materia.' });
  }
});

// DELETE /api/subjects/:id — Eliminar materia (Admin)
router.delete('/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { role } = (req as any).user;
  if (role !== 'ADMIN' && role !== 'MAESTRO') return res.status(403).json({ error: 'No autorizado.' });

  try {
    
    // Check if it has questions
    const count = await prisma.question.count({ where: { subjectId: id } });
    if (count > 0) {
      return res.status(409).json({ error: 'No se puede eliminar porque tiene reactivos asociados.' });
    }

    await prisma.subject.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar la materia.' });
  }
});

export default router;
