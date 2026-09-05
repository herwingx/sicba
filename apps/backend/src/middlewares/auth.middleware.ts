import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@sicba/database';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-for-dev';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Middleware para validar que la petición incluye un token JWT válido y que es la Sesión Activa (Anti-trampa).
 * Lo implementé para proteger nuestras rutas y extraer el ID y Rol del usuario en sesión.
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado. Falta token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    
    // CONTROL DE SESIÓN ÚNICA: Validar si este token sigue siendo el activo en la Base de Datos
    const session = await prisma.session.findUnique({
      where: { token: token }
    });

    if (!session) {
      res.status(401).json({ error: 'Sesión expirada o iniciada en otro dispositivo.' });
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
