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
    
    const user = await prisma.user.findUnique({ where: { email } });
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
    
    res.json({ token, role: user.role, email: user.email });
  } catch (error) {
    res.status(500).json({ error: 'Error en inicio de sesión' });
  }
});

export default router;
