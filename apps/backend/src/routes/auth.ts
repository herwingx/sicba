import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@sicba/database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-for-dev';

/**
 * Registro de un nuevo usuario.
 * @route POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;
    
    // Verificamos si existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El usuario ya existe' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'ALUMNO',
        profile: {
          create: {
            firstName: firstName || '',
            lastName: lastName || ''
          }
        }
      }
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al registrar' });
  }
});

/**
 * Login de usuario. Retorna un JWT.
 * @route POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { profile: true }
    });
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Generar Token
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    
    // CONTROL DE SESIÓN ÚNICA (Anti-trampa)
    // 1. Invalidar cualquier sesión anterior de este usuario
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    // 2. Registrar la nueva sesión
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8); // Coincide con JWT expiresIn

    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        expiresAt
      }
    });
    
    const name = user.profile 
      ? `${user.profile.firstName} ${user.profile.lastName}`.trim() 
      : (user.role === 'ADMIN' ? 'Administrador' : 'Alumno');

    res.json({ token, role: user.role, email: user.email, name });
  } catch (error) {
    res.status(500).json({ error: 'Error en inicio de sesión' });
  }
});

export default router;
