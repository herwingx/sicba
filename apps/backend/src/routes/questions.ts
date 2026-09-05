import { Router, Request, Response, RequestHandler } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth, AuthRequest } from '../middlewares/auth.middleware';
import multer from 'multer';
import * as xlsx from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
 * Crea un nuevo reactivo de forma individual.
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
          create: options
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

/**
 * Carga masiva de reactivos mediante un archivo Excel (.xlsx) o CSV.
 * @route POST /api/questions/bulk
 */
router.post('/bulk', requireAuth, upload.single('file') as RequestHandler, async (req: AuthRequest, res: Response) => {
  if (req.user?.role === 'ALUMNO') {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Debes enviar un archivo .xlsx o .csv en el campo "file"' });
    return;
  }

  try {
    // 1. Leer el archivo desde el buffer en memoria
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 2. Convertir la hoja a JSON
    const rows = xlsx.utils.sheet_to_json<any>(sheet);
    
    if (rows.length === 0) {
      res.status(400).json({ error: 'El archivo está vacío' });
      return;
    }

    let importedCount = 0;

    // 3. Procesar las filas dentro de una transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        // Se espera que el excel tenga: subjectId, content, difficulty, explanation
        // Y opciones: option1, isCorrect1 (bool), option2, isCorrect2, etc...
        const { subjectId, content, difficulty, explanation, option1, isCorrect1, option2, isCorrect2, option3, isCorrect3, option4, isCorrect4 } = row;
        
        if (!subjectId || !content) continue;

        const optionsToCreate = [];
        if (option1) optionsToCreate.push({ content: String(option1), isCorrect: isCorrect1 === true || isCorrect1 === 'TRUE' || isCorrect1 === 'true' });
        if (option2) optionsToCreate.push({ content: String(option2), isCorrect: isCorrect2 === true || isCorrect2 === 'TRUE' || isCorrect2 === 'true' });
        if (option3) optionsToCreate.push({ content: String(option3), isCorrect: isCorrect3 === true || isCorrect3 === 'TRUE' || isCorrect3 === 'true' });
        if (option4) optionsToCreate.push({ content: String(option4), isCorrect: isCorrect4 === true || isCorrect4 === 'TRUE' || isCorrect4 === 'true' });

        await tx.question.create({
          data: {
            subjectId: String(subjectId),
            content: String(content),
            difficulty: difficulty ? Number(difficulty) : 1,
            explanation: explanation ? String(explanation) : null,
            options: {
              create: optionsToCreate
            }
          }
        });
        importedCount++;
      }
    });

    res.status(201).json({ message: `Carga masiva exitosa. Se insertaron ${importedCount} reactivos.` });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({ error: 'Error procesando el archivo de carga masiva' });
  }
});

export default router;
