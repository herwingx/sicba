import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Obtiene todos los reactivos.
 * @route GET /api/questions
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        subject: true,
        options: true
      }
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reactivos' });
  }
});

/**
 * Crea un nuevo reactivo.
 * @route POST /api/questions
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role === 'ALUMNO') {
    res.status(403).json({ error: 'No tienes permisos para crear reactivos.' });
    return;
  }

  try {
    const { subjectId, content, difficulty, explanation, options } = req.body;
    
    const question = await prisma.question.create({
      data: {
        subjectId,
        content,
        difficulty,
        explanation,
        options: {
          create: options // options debe ser un array con { content, isCorrect }
        }
      },
      include: {
        options: true
      }
    });

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el reactivo' });
  }
});

export default router;
