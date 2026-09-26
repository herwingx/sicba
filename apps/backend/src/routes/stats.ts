import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '@sicba/database';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user!;
    const isAdmin = user.role === 'ADMIN' || user.role === 'MAESTRO';

    if (isAdmin) {
      const [
        totalQuestions,
        activeExams,
        totalStudents,
        averageScoreAggr
      ] = await Promise.all([
        prisma.question.count(),
        prisma.exam.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: 'ALUMNO' } }),
        prisma.participation.aggregate({
          _avg: { score: true },
          where: { status: 'SUBMITTED' }
        })
      ]);

      return res.json({
        totalQuestions,
        activeExams,
        totalStudents,
        averageScore: averageScoreAggr._avg.score || 0
      });
    } else {
      // Stats for Alumno
      const [
        completedExams,
        averageScoreAggr,
        totalExams
      ] = await Promise.all([
        prisma.participation.count({
          where: { studentId: user.id, status: 'SUBMITTED' }
        }),
        prisma.participation.aggregate({
          _avg: { score: true },
          where: { studentId: user.id, status: 'SUBMITTED' }
        }),
        prisma.participation.count({
          where: { studentId: user.id, status: 'IN_PROGRESS' }
        })
      ]);

      return res.json({
        completedExams,
        averageScore: averageScoreAggr._avg.score || 0,
        totalExams
      });
    }
  } catch (error) {
    console.error('[GET /api/stats] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reports', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user!;
    if (user.role === 'ALUMNO') return res.status(403).json({ error: 'Forbidden' });

    // Promedio de calificaciones por materia
    const participations = await prisma.participation.findMany({
      where: { status: 'SUBMITTED' },
      include: { exam: { include: { subject: true } } }
    });

    const subjectStats: Record<string, { total: number, count: number }> = {};
    const recentScores: any[] = [];

    participations.forEach((p: any) => {
      const subjectName = p.exam.subject.name;
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { total: 0, count: 0 };
      }
      subjectStats[subjectName].total += p.score || 0;
      subjectStats[subjectName].count += 1;

      // ultimos scores (para grafica de tendencia, limitamos a 20)
      recentScores.push({
        date: p.finishedAt ? p.finishedAt.toISOString().split('T')[0] : p.updatedAt.toISOString().split('T')[0],
        score: p.score || 0
      });
    });

    const radarData = Object.keys(subjectStats).map(subject => ({
      subject,
      promedio: Number((subjectStats[subject].total / subjectStats[subject].count).toFixed(1))
    }));

    // Agrupar recientes por fecha
    const trendMap: Record<string, { total: number, count: number }> = {};
    recentScores.forEach(s => {
      if (!trendMap[s.date]) trendMap[s.date] = { total: 0, count: 0 };
      trendMap[s.date].total += s.score;
      trendMap[s.date].count += 1;
    });

    const lineData = Object.keys(trendMap).sort().map(date => ({
      date,
      promedio: Number((trendMap[date].total / trendMap[date].count).toFixed(1))
    }));

    res.json({ radarData, lineData });
  } catch (error) {
    console.error('[GET /api/stats/reports] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
