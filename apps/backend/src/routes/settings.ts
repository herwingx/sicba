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

export default router;
