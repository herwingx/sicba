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
    const { subjectId } = req.query;
    
    const whereClause = subjectId ? { subjectId: String(subjectId) } : {};

    const questions = await prisma.question.findMany({
      where: whereClause,
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
 * Descarga una plantilla Excel (.xlsx) para carga masiva de reactivos,
 * incluyendo los UUIDs de las materias en una segunda hoja para referencia.
 * @route GET /api/questions/template
 */
router.get('/template', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
    
    // Hoja principal: Formato
    const templateData = [
      {
        subjectId: subjects.length > 0 ? subjects[0].id : 'COPIA_AQUI_EL_ID',
        content: 'Pregunta de ejemplo: ¿Cuánto es 2+2?',
        difficulty: 1,
        explanation: 'Porque 1+1=2 y 2+2=4',
        option1: '3',
        isCorrect1: 'FALSE',
        option2: '4',
        isCorrect2: 'TRUE',
        option3: '5',
        isCorrect3: 'FALSE',
        option4: '6',
        isCorrect4: 'FALSE'
      }
    ];

    // Hoja secundaria: Diccionario de Materias
    const dictionaryData = subjects.map(s => ({
      Materia: s.name,
      'ID (subjectId)': s.id
    }));

    const workbook = xlsx.utils.book_new();
    const mainSheet = xlsx.utils.json_to_sheet(templateData);
    const dictSheet = xlsx.utils.json_to_sheet(dictionaryData);

    xlsx.utils.book_append_sheet(workbook, mainSheet, 'Plantilla');
    xlsx.utils.book_append_sheet(workbook, dictSheet, 'IDs de Materias');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_reactivos_sicba.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar la plantilla' });
  }
});

/**
 * Descarga todos los reactivos actuales de la base de datos en formato Excel (.xlsx).
 * @route GET /api/questions/export
 */
router.get('/export', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role === 'ALUMNO') {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  try {
    const questions = await prisma.question.findMany({
      include: {
        subject: { select: { name: true } },
        options: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const rows = questions.map(q => {
      const row: any = {
        subjectId: q.subject.name,
        content: q.content,
        difficulty: q.difficulty,
        explanation: q.explanation || ''
      };

      // Agregar las opciones dinámicamente, hasta un máximo de 4 para el formato estándar
      q.options.slice(0, 4).forEach((opt, idx) => {
        row[`option${idx + 1}`] = opt.content;
        row[`isCorrect${idx + 1}`] = opt.isCorrect ? 'TRUE' : 'FALSE';
      });

      return row;
    });

    const workbook = xlsx.utils.book_new();
    const mainSheet = xlsx.utils.json_to_sheet(rows.length > 0 ? rows : [{ subjectId: 'Sin datos' }]);
    xlsx.utils.book_append_sheet(workbook, mainSheet, 'Reactivos Exportados');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="banco_reactivos_sicba.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting questions:', error);
    res.status(500).json({ error: 'Error al exportar los reactivos' });
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

    // 3. Procesar las filas y crear un arreglo de operaciones
    const operations = [];
    const subjectCache = new Map<string, string>(); // Para no saturar la BD buscando el mismo nombre

    for (const row of rows) {
      // Se espera que el excel tenga: subjectId, content, difficulty, explanation
      // Y opciones: option1, isCorrect1 (bool), option2, isCorrect2, etc...
      const { subjectId, content, difficulty, explanation, option1, isCorrect1, option2, isCorrect2, option3, isCorrect3, option4, isCorrect4 } = row;
      
      if (!subjectId || !content) continue;

      let finalSubjectId = String(subjectId).trim();

      // Si no es un UUID (36 caracteres), intentamos buscar la materia por nombre (ignorando mayúsculas/minúsculas)
      if (finalSubjectId.length !== 36) {
        const lowerName = finalSubjectId.toLowerCase();
        if (subjectCache.has(lowerName)) {
          finalSubjectId = subjectCache.get(lowerName)!;
        } else {
          const subject = await prisma.subject.findFirst({
            where: { name: { equals: finalSubjectId, mode: 'insensitive' } }
          });
          
          if (subject) {
            subjectCache.set(lowerName, subject.id);
            finalSubjectId = subject.id;
          } else {
            // Si la materia no existe, no insertamos este reactivo
            continue;
          }
        }
      }

      const optionsToCreate = [];
      if (option1) optionsToCreate.push({ content: String(option1), isCorrect: isCorrect1 === true || isCorrect1 === 'TRUE' || isCorrect1 === 'true' });
      if (option2) optionsToCreate.push({ content: String(option2), isCorrect: isCorrect2 === true || isCorrect2 === 'TRUE' || isCorrect2 === 'true' });
      if (option3) optionsToCreate.push({ content: String(option3), isCorrect: isCorrect3 === true || isCorrect3 === 'TRUE' || isCorrect3 === 'true' });
      if (option4) optionsToCreate.push({ content: String(option4), isCorrect: isCorrect4 === true || isCorrect4 === 'TRUE' || isCorrect4 === 'true' });

      operations.push(
        prisma.question.create({
          data: {
            subjectId: finalSubjectId,
            content: String(content),
            difficulty: difficulty ? Number(difficulty) : 1,
            explanation: explanation ? String(explanation) : null,
            options: {
              create: optionsToCreate
            }
          }
        })
      );
    }

    // 4. Ejecutar las inserciones en una transacción secuencial (evita P2028 Interactive Transactions limit)
    await prisma.$transaction(operations);
    importedCount = operations.length;

    res.status(201).json({ message: `Carga masiva exitosa. Se insertaron ${importedCount} reactivos.` });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({ error: 'Error procesando el archivo de carga masiva' });
  }
});

/**
 * Actualiza un reactivo existente.
 * @route PATCH /api/questions/:id
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  if ((req as any).user?.role === 'ALUMNO') {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  try {
    const { subjectId, content, difficulty, explanation, options } = req.body;

    // Actualizamos en una transacción para borrar las opciones viejas y crear las nuevas
    // Usamos transacción secuencial (array) para evitar errores de PgBouncer con transacciones interactivas
    const operations = [];
    if (options && Array.isArray(options)) {
      operations.push(prisma.option.deleteMany({ where: { questionId: id } }));
    }

    operations.push(prisma.question.update({
      where: { id },
      data: {
        subjectId,
        content,
        difficulty,
        explanation,
        ...(options && Array.isArray(options) ? {
          options: {
            create: options
          }
        } : {})
      },
      include: { options: true }
    }));

    const results = await prisma.$transaction(operations);
    const question = results[results.length - 1];

    res.json(question);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Error al actualizar el reactivo' });
  }
});

/**
 * Elimina un reactivo existente.
 * @route DELETE /api/questions/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  if ((req as any).user?.role === 'ALUMNO') {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  try {
    await prisma.question.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Error al eliminar el reactivo' });
  }
});

export default router;
