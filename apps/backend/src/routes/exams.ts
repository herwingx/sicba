import { Router, Request, Response } from 'express';
import { prisma } from '@sicba/database';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ─── UTILIDAD: Fisher-Yates Shuffle ─────────────────────────────────────────
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
        isActive: false, // Siempre inactivo al crear — se activa con /publish
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
/**
 * Para ALUMNO: incluye su participación (status, score) para mostrar en tabla.
 * Para ADMIN/MAESTRO: devuelve todos los exámenes.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { role, id: userId } = (req as any).user;

  try {
    const exams = await prisma.exam.findMany({
      where: role === 'ALUMNO' ? { isActive: true } : undefined,
      include: {
        subject: { select: { name: true } },
        creator: { select: { profile: { select: { firstName: true, lastName: true } } } },
        _count: { select: { questions: true, participations: true } },
        // Para alumnos: incluir su propia participación
        participations: role === 'ALUMNO'
          ? { where: { studentId: userId }, select: { status: true, score: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Para alumnos, aplanar la participación propia al nivel del examen
    if (role === 'ALUMNO') {
      const examsWithParticipation = exams.map((exam) => {
        const myParticipation = (exam.participations as { status: string; score: number | null }[])[0] ?? null;
        const { participations: _p, ...rest } = exam;
        return { ...rest, myParticipation };
      });
      return res.json(examsWithParticipation);
    }

    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener la lista de exámenes.' });
  }
});

// ─── GET /api/exams/:id/results — Resultados de un Examen (Admin/Maestro) ────
/**
 * Devuelve el ranking de participaciones del examen con datos del alumno.
 * Solo accesible por ADMIN y MAESTRO.
 */
router.get('/:id/results', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const examId = req.params['id'] as string;

  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'No autorizado.' });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true, timeLimit: true },
    });
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });

    const participations = await prisma.participation.findMany({
      where: { examId },
      include: {
        // Datos del alumno via User
        // Nota: studentId es el User.id
      },
      orderBy: [
        { score: 'desc' },
        { finishedAt: 'asc' },
      ],
    });

    // Enriquecer con datos del perfil del alumno
    const studentIds = participations.map((p) => p.studentId);
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: studentIds } },
      select: { userId: true, firstName: true, lastName: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const results = participations.map((p, idx) => {
      const profile = profileMap.get(p.studentId);
      const durationMs = p.startedAt && p.finishedAt
        ? new Date(p.finishedAt).getTime() - new Date(p.startedAt).getTime()
        : null;
      const durationMin = durationMs !== null ? Math.round(durationMs / 60000) : null;

      return {
        rank: idx + 1,
        participationId: p.id,
        studentId: p.studentId,
        studentName: profile ? `${profile.firstName} ${profile.lastName}` : 'Sin perfil',
        status: p.status,
        score: p.score,
        startedAt: p.startedAt,
        finishedAt: p.finishedAt,
        durationMin,
      };
    });

    return res.json({ exam, results, total: results.length });
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    return res.status(500).json({ error: 'Error interno al obtener resultados.' });
  }
});

// ─── PATCH /api/exams/:id/publish — Publicar / Despublicar Examen ────────────
router.patch('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const examId = req.params['id'] as string;

  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'No autorizado.' });
  }

  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });

    if (exam.isActive) {
      const inProgress = await prisma.participation.count({
        where: { examId, status: 'IN_PROGRESS' },
      });
      if (inProgress > 0) {
        return res.status(409).json({
          error: `No puedes desactivar el examen: hay ${inProgress} alumno(s) respondiéndolo actualmente.`,
        });
      }
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: { isActive: !exam.isActive },
    });

    return res.json({
      message: updated.isActive ? 'Examen publicado.' : 'Examen despublicado.',
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('Error al publicar examen:', error);
    return res.status(500).json({ error: 'Error interno al publicar el examen.' });
  }
});

// ─── POST /api/exams/:id/start — Iniciar Examen (Alumno) ────────────────────
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
                  select: { id: true, content: true }, // isCorrect omitido
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

    type ParticipationWithAnswers = Awaited<ReturnType<typeof prisma.participation.findUnique>> & {
      answers: { id: string; participationId: string; questionId: string; selectedOptionId: string | null; timeSpent: number; createdAt: Date; updatedAt: Date }[]
    }

    let participation: ParticipationWithAnswers | null = await prisma.participation.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { answers: true },
    }) as ParticipationWithAnswers | null;

    if (!participation) {
      participation = await prisma.participation.create({
        data: {
          examId,
          studentId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
        include: { answers: true },
      }) as ParticipationWithAnswers;
    }

    if (participation!.status === 'SUBMITTED') {
      return res.status(409).json({
        error: 'Ya entregaste este examen.',
        alreadySubmitted: true,
        score: participation!.score,
      });
    }

    const shuffledQuestions = shuffleArray(exam.questions).map((eq) => ({
      questionId: eq.question.id,
      content: eq.question.content,
      difficulty: eq.question.difficulty,
      options: shuffleArray(eq.question.options),
    }));

    const savedAnswers: Record<string, string> = {};
    for (const ans of (participation!.answers ?? [])) {
      if (ans.selectedOptionId) {
        savedAnswers[ans.questionId] = ans.selectedOptionId;
      }
    }

    return res.json({
      participationId: participation!.id,
      examId: exam.id,
      title: exam.title,
      timeLimit: exam.timeLimit,
      endTime: exam.endTime,
      questions: shuffledQuestions,
      savedAnswers,
    });
  } catch (error) {
    console.error('Error al iniciar examen:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: `Error interno al iniciar el examen: ${msg}` });
  }
});

// ─── POST /api/exams/:id/answer — Registrar Respuesta ───────────────────────
router.post('/:id/answer', requireAuth, async (req: Request, res: Response) => {
  const { id: studentId } = (req as any).user;
  const examId = req.params['id'] as string;
  const { questionId, selectedOptionId } = req.body;

  if (!questionId || !selectedOptionId) {
    return res.status(400).json({ error: 'questionId y selectedOptionId son requeridos.' });
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { select: { questionId: true } } },
    });
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });
    if (new Date() > exam.endTime) {
      return res.status(403).json({ error: 'El tiempo del examen ya expiró. Respuesta rechazada.' });
    }

    // ─── Seguridad: validar que la pregunta pertenece al examen ──────────────
    const validQuestionIds = exam.questions.map((q) => q.questionId);
    if (!validQuestionIds.includes(questionId)) {
      return res.status(400).json({ error: 'La pregunta no pertenece a este examen.' });
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
 * Calcula el puntaje server-side y devuelve el breakdown completo
 * (pregunta, opción elegida, opción correcta, explicación) para retroalimentación.
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
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!participation) return res.status(404).json({ error: 'No has iniciado este examen.' });

    if (participation.status === 'SUBMITTED') {
      // Ya entregado — reconstruir breakdown de las respuestas guardadas
      const breakdown = buildBreakdown(participation);
      return res.json({
        message: 'Examen ya entregado.',
        score: participation.score,
        correctCount: breakdown.filter((b: any) => b.isCorrect).length,
        totalQuestions: breakdown.length,
        breakdown,
      });
    }

    // Calcular puntaje
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

    const breakdown = buildBreakdown(participation);

    return res.json({
      message: 'Examen entregado y calificado.',
      score,
      correctCount,
      totalQuestions,
      breakdown, // Desglose completo para retroalimentación
    });
  } catch (error) {
    console.error('Error al entregar examen:', error);
    return res.status(500).json({ error: 'Error interno al calificar el examen.' });
  }
});

/**
 * Construye el desglose de respuestas para retroalimentación al alumno.
 * Revela isCorrect y explanation SOLO después de entregar.
 */
function buildBreakdown(participation: any) {
  const answerMap = new Map(
    participation.answers.map((a: any) => [a.questionId, a.selectedOptionId])
  );

  return participation.exam.questions.map((eq: any) => {
    const q = eq.question;
    const correctOption = q.options.find((o: any) => o.isCorrect);
    const selectedOptionId = answerMap.get(q.id) ?? null;
    const selectedOption = q.options.find((o: any) => o.id === selectedOptionId) ?? null;
    const isCorrect = !!correctOption && correctOption.id === selectedOptionId;

    return {
      questionId: q.id,
      content: q.content,
      difficulty: q.difficulty,
      explanation: q.explanation ?? null,
      selectedOptionId,
      selectedOptionContent: selectedOption?.content ?? null,
      correctOptionId: correctOption?.id ?? null,
      correctOptionContent: correctOption?.content ?? null,
      isCorrect,
      options: q.options.map((o: any) => ({
        id: o.id,
        content: o.content,
        isCorrect: o.isCorrect,
      })),
    };
  });
}

// ─── DELETE /api/exams/:id — Borrar Examen (Admin/Maestro) ──────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const examId = req.params['id'] as string;

  if (role !== 'ADMIN' && role !== 'MAESTRO') {
    return res.status(403).json({ error: 'Solo administradores pueden borrar exámenes.' });
  }

  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });

    const inProgress = await prisma.participation.count({
      where: { examId, status: 'IN_PROGRESS' },
    });

    if (inProgress > 0) {
      return res.status(409).json({
        error: `No puedes eliminar el examen: hay ${inProgress} alumno(s) respondiéndolo actualmente. Espera a que finalice el tiempo o que todos entreguen.`,
      });
    }

    await prisma.exam.delete({ where: { id: examId } });
    return res.json({ message: 'Examen eliminado correctamente.' });
  } catch (error) {
    console.error('Error al borrar examen:', error);
    return res.status(500).json({ error: 'Error interno al borrar el examen.' });
  }
});

export default router;
