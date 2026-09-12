import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ─── UTILIDAD: Fisher-Yates Shuffle ─────────────────────────────────────────
/**
 * Implementé el algoritmo Fisher-Yates para garantizar que cada alumno
 * reciba las preguntas en un orden verdaderamente aleatorio, eliminando
 * el riesgo de que memoricen el orden entre concursos.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── POST /api/exams — Crear Examen (Admin/Maestro) ─────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  // NOTA: req.user.id (no userId) — así lo define auth.middleware.ts
  const { role, id: creatorId } = (req as any).user;

  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'Solo administradores y maestros pueden crear exámenes.' });
  }

  const { title, description, subjectId, questionIds, timeLimit, startTime, endTime } = req.body;

  if (!title || !subjectId || !questionIds?.length || !timeLimit || !startTime || !endTime) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  try {
    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        subjectId,
        creatorId: creatorId as string,
        timeLimit: Number(timeLimit),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isActive: true,
        questions: {
          create: (questionIds as string[]).map((qId: string, index: number) => ({
            questionId: qId,
            order: index + 1,
          })),
        },
      },
      include: { questions: true, subject: true },
    });

    return res.status(201).json({ message: 'Examen creado exitosamente.', exam });
  } catch (error) {
    console.error('Error al crear examen:', error);
    return res.status(500).json({ error: 'Error interno al crear el examen.' });
  }
});

// ─── GET /api/exams — Listar Exámenes ────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  try {
    const exams = await prisma.exam.findMany({
      where: role === 'ALUMNO' ? { isActive: true } : undefined,
      include: {
        subject: { select: { name: true } },
        creator: { select: { profile: { select: { firstName: true, lastName: true } } } },
        _count: { select: { questions: true, participations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la lista de exámenes.' });
  }
});

// ─── POST /api/exams/:id/start — Iniciar Examen (Alumno) ────────────────────
/**
 * El alumno inicia el examen. El backend:
 * 1. Verifica que el examen esté activo y dentro del tiempo permitido.
 * 2. Crea (o recupera) la Participation del alumno.
 * 3. Devuelve las preguntas en orden ALEATORIO (Fisher-Yates).
 * 4. NUNCA revela qué opción es la correcta (isCorrect se omite).
 */
router.post('/:id/start', requireAuth, async (req: Request, res: Response) => {
  const { id: studentId } = (req as any).user;
  const examId = req.params['id'] as string;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: {
                  select: { id: true, content: true }, // isCorrect OMITIDO intencionalmente
                },
              },
            },
          },
        },
      },
    });

    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });
    if (!exam.isActive) return res.status(403).json({ error: 'Este examen no está activo.' });

    const now = new Date();
    if (now < exam.startTime) return res.status(403).json({ error: 'El examen aún no ha comenzado.' });
    if (now > exam.endTime) return res.status(403).json({ error: 'El tiempo del examen ya expiró.' });

    // Recuperar o crear la Participation (idempotente)
    let participation = await prisma.participation.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });

    if (!participation) {
      participation = await prisma.participation.create({
        data: {
          examId,
          studentId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    }

    if (participation.status === 'SUBMITTED') {
      return res.status(403).json({ error: 'Ya entregaste este examen. No puedes reiniciarlo.' });
    }

    // Shuffle de preguntas y opciones (Fisher-Yates)
    const shuffledQuestions = shuffleArray(exam.questions).map((eq) => ({
      questionId: eq.question.id,
      content: eq.question.content,
      difficulty: eq.question.difficulty,
      options: shuffleArray(eq.question.options),
    }));

    return res.json({
      participationId: participation.id,
      examId: exam.id,
      title: exam.title,
      timeLimit: exam.timeLimit,
      endTime: exam.endTime,
      questions: shuffledQuestions,
    });
  } catch (error) {
    console.error('Error al iniciar examen:', error);
    return res.status(500).json({ error: 'Error interno al iniciar el examen.' });
  }
});

// ─── POST /api/exams/:id/answer — Registrar Respuesta ───────────────────────
/**
 * Upsert de la respuesta de una pregunta. Valida en servidor que el tiempo
 * no haya expirado para evitar manipulación del cliente.
 */
router.post('/:id/answer', requireAuth, async (req: Request, res: Response) => {
  const { id: studentId } = (req as any).user;
  const examId = req.params['id'] as string;
  const { questionId, selectedOptionId } = req.body;

  if (!questionId || !selectedOptionId) {
    return res.status(400).json({ error: 'questionId y selectedOptionId son requeridos.' });
  }

  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });
    if (new Date() > exam.endTime) {
      return res.status(403).json({ error: 'El tiempo del examen ya expiró. Respuesta rechazada.' });
    }

    const participation = await prisma.participation.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });

    if (!participation) return res.status(404).json({ error: 'No has iniciado este examen.' });
    if (participation.status === 'SUBMITTED') {
      return res.status(403).json({ error: 'El examen ya fue entregado.' });
    }

    const answer = await prisma.answer.upsert({
      where: { participationId_questionId: { participationId: participation.id, questionId } },
      update: { selectedOptionId },
      create: { participationId: participation.id, questionId, selectedOptionId },
    });

    return res.json({ message: 'Respuesta registrada.', answerId: answer.id });
  } catch (error) {
    console.error('Error al registrar respuesta:', error);
    return res.status(500).json({ error: 'Error interno al guardar la respuesta.' });
  }
});

// ─── POST /api/exams/:id/submit — Entregar y Calificar ──────────────────────
/**
 * Cierra el examen y calcula el puntaje server-side.
 * Score = (correctas / total) * 100. Diseñado así para que sea
 * imposible falsificar el puntaje desde el cliente.
 */
router.post('/:id/submit', requireAuth, async (req: Request, res: Response) => {
  const { id: studentId } = (req as any).user;
  const examId = req.params['id'] as string;

  try {
    const participation = await prisma.participation.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: {
        answers: true,
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: true },
                },
              },
            },
          },
        },
      },
    });

    if (!participation) return res.status(404).json({ error: 'No has iniciado este examen.' });
    if (participation.status === 'SUBMITTED') {
      return res.json({ message: 'Examen ya entregado.', score: participation.score });
    }

    // Calcular puntaje comparando opciones seleccionadas con las correctas
    const totalQuestions = participation.exam.questions.length;
    let correctCount = 0;

    for (const answer of participation.answers) {
      if (!answer.selectedOptionId) continue;
      for (const examQuestion of participation.exam.questions) {
        const correctOption = examQuestion.question.options.find(
          (o: { id: string; isCorrect: boolean }) => o.isCorrect
        );
        if (
          examQuestion.question.id === answer.questionId &&
          correctOption?.id === answer.selectedOptionId
        ) {
          correctCount++;
          break;
        }
      }
    }

    const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const score = Math.round(rawScore * 100) / 100;

    await prisma.participation.update({
      where: { id: participation.id },
      data: { status: 'SUBMITTED', score, finishedAt: new Date() },
    });

    return res.json({ message: 'Examen entregado y calificado.', score, correctCount, totalQuestions });
  } catch (error) {
    console.error('Error al entregar examen:', error);
    return res.status(500).json({ error: 'Error interno al calificar el examen.' });
  }
});

export default router;
