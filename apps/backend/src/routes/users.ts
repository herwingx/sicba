import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth } from '../middlewares/auth.middleware';
import bcrypt from 'bcryptjs';

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

// ─── PATCH /api/users/:id — Editar usuario (Solo Admin) ─────────────────────
/**
 * Permite al Admin editar el correo, nombre, apellido, semestre y contraseña
 * de cualquier usuario. Si se envía password, se re-hashea.
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { role } = (req as any).user;

  if (role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo el administrador puede editar usuarios.' });
    return;
  }

  const userId = req.params['id'] as string;
  const { email, firstName, lastName, semester, password } = req.body;

  try {
    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // Verificar duplicado de email si cambió
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        res.status(409).json({ error: 'Ese correo ya está en uso por otro usuario.' });
        return;
      }
    }

    // Actualizar User (email y/o password)
    const userUpdate: any = {};
    if (email) userUpdate.email = email;
    if (password && password.trim().length >= 6) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userUpdate });
    }

    // Actualizar Profile (nombre, apellido, semestre)
    const profileUpdate: any = {};
    if (firstName !== undefined) profileUpdate.firstName = firstName;
    if (lastName !== undefined) profileUpdate.lastName = lastName;
    if (semester !== undefined) profileUpdate.semester = semester ? parseInt(semester, 10) : null;

    if (Object.keys(profileUpdate).length > 0) {
      await prisma.profile.updateMany({ where: { userId }, data: profileUpdate });
    }

    res.json({ message: 'Usuario actualizado correctamente.' });
  } catch (error) {
    console.error('Error al editar usuario:', error);
    res.status(500).json({ error: 'Error interno al editar el usuario.' });
  }
});

// ─── DELETE /api/users/:id — Eliminar usuario (Solo Admin) ──────────────────
/**
 * Elimina un usuario individual. Protege contra:
 * 1. Auto-eliminación (no puedes borrarte a ti mismo).
 * 2. Usuarios con exámenes activos (IN_PROGRESS).
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { role, id: adminId } = (req as any).user;

  if (role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo el administrador puede eliminar usuarios.' });
    return;
  }

  const userId = req.params['id'] as string;

  // Protección: no puedes borrarte a ti mismo
  if (userId === adminId) {
    res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // Verificar si tiene exámenes en progreso
    const activeParticipation = await prisma.participation.findFirst({
      where: { studentId: userId, status: 'IN_PROGRESS' },
    });

    if (activeParticipation) {
      res.status(409).json({ 
        error: 'Este usuario tiene un examen en curso. No se puede eliminar hasta que lo finalice o se cancele su participación.' 
      });
      return;
    }

    // Eliminar en cascada (Profile se borra automáticamente por onDelete: Cascade)
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno al eliminar el usuario.' });
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
