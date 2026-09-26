import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Obtener estado de los registros (Público)
 * @route GET /api/settings/registration
 */
router.get('/registration', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'REGISTRATION_OPEN' }
    });
    
    // Si no existe, por defecto asumimos abierto o cerrado. Asumiremos falso para máxima seguridad.
    const isOpen = setting ? setting.value === 'true' : false;
    
    res.json({ isOpen });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la configuración' });
  }
});

/**
 * Cambiar estado de los registros (Solo Admin)
 * @route PATCH /api/settings/registration
 */
router.patch('/registration', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      res.status(400).json({ error: 'El valor isOpen debe ser booleano' });
      return;
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'REGISTRATION_OPEN' },
      update: { value: isOpen.toString() },
      create: {
        key: 'REGISTRATION_OPEN',
        value: isOpen.toString(),
        description: 'Controla si los alumnos pueden crear cuentas nuevas'
      }
    });

    res.json({ message: 'Configuración actualizada', isOpen: setting.value === 'true' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

/**
 * Obtener dominios permitidos (Público)
 * @route GET /api/settings/domains
 */
router.get('/domains', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ALLOWED_DOMAINS' }
    });
    
    // Si no existe, usamos el valor por defecto
    const domains = setting ? setting.value.split(',').map(d => d.trim()) : ['@mina.tecnm.mx'];
    
    res.json({ domains });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar dominios' });
  }
});

/**
 * Cambiar dominios permitidos (Solo Admin)
 * @route PATCH /api/settings/domains
 */
router.patch('/domains', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    const { domains } = req.body;

    if (!Array.isArray(domains)) {
      res.status(400).json({ error: 'Se esperaba un arreglo de dominios' });
      return;
    }

    const value = domains.map(d => d.trim().toLowerCase()).join(',');

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'ALLOWED_DOMAINS' },
      update: { value },
      create: {
        key: 'ALLOWED_DOMAINS',
        value,
        description: 'Dominios de correo permitidos para registro de alumnos'
      }
    });

    res.json({ message: 'Dominios actualizados', domains: setting.value.split(',') });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar dominios' });
  }
});

export default router;
