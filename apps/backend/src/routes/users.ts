import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ─── GET /api/users — Listar usuarios (Admin/Maestro) ───────────────────────
/**
 * Lista usuarios del sistema filtrados por rol.
 * ?role=ALUMNO | MAESTRO | ADMIN
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'Solo administradores pueden ver la lista de usuarios.' });
  }

  const filterRole = (req.query['role'] as string)?.toUpperCase();

  try {
    const users = await prisma.user.findMany({
      where: filterRole ? { role: filterRole as any } : undefined,
      include: {
        profile: { select: { firstName: true, lastName: true, career: true, semester: true } },
        _count: { select: { examsCreated: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.profile?.firstName ?? null,
      lastName: u.profile?.lastName ?? null,
      career: u.profile?.career ?? null,
      semester: u.profile?.semester ?? null,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    return res.status(500).json({ error: 'Error interno al obtener usuarios.' });
  }
});

// ─── DELETE /api/users/purge — Purgar todos los alumnos (Solo Admin) ─────────
router.delete('/purge', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo el administrador puede purgar alumnos.' });
  }

  try {
    const deleted = await prisma.user.deleteMany({
      where: { role: 'ALUMNO' }
    });
    return res.json({ message: `Se han eliminado ${deleted.count} alumnos de la base de datos.` });
  } catch (error) {
    console.error('Error al purgar alumnos:', error);
    return res.status(500).json({ error: 'Error interno al purgar alumnos.' });
  }
});

export default router;
