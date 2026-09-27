import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Loader2Icon, TrophyIcon, UsersIcon, ClockIcon, ArrowLeftIcon, ExpandIcon, MinimizeIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FraudLog } from './FraudLog';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentState {
  studentId: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      controlNumber: string | null;
      institution: string | null;
    } | null;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DISQUALIFIED';
  score: number | null;
  answeredCount: number;
  totalQuestions: number;
  timeSpent: number; // milliseconds
  startedAt: string | null;
}

export function LiveScoreboard({ examId, onBack }: { examId: string, onBack: () => void }) {
  const token = localStorage.getItem('sicba_token');
  
  const [examTitle, setExamTitle] = useState('Cargando examen...');
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [students, setStudents] = useState<Record<string, StudentState>>({});
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Cronómetro en vivo para participantes en progreso
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch inicial
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/exams/${examId}/live-scoreboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar datos iniciales');
        const data = await res.json();
        
        setExamTitle(data.examTitle);
        setTotalQuestions(data.totalQuestions || 0);
        
        const initialMap: Record<string, StudentState> = {};
        data.scoreboard.forEach((p: any) => {
          initialMap[p.studentId] = {
            studentId: p.studentId,
            user: p.user,
            status: p.status,
            score: p.score,
            answeredCount: p.answeredCount,
            totalQuestions: p.totalQuestions,
            timeSpent: p.timeSpent,
            startedAt: p.startedAt
          };
        });
        setStudents(initialMap);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [examId, token]);

  // Conexión Socket.io
  useEffect(() => {
    if (!token) return;
    
    // Conectar al backend WebSocket
    const newSocket = io(`${import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'}`);

    newSocket.on('connect', () => {
      console.log('Conectado a Socket.io, uniendo a sala del examen...');
      newSocket.emit('join_exam_room', examId);
    });

    newSocket.on('student_joined', (data: any) => {
      setStudents(prev => ({
        ...prev,
        [data.studentId]: {
          ...data,
          totalQuestions: prev[data.studentId]?.totalQuestions || totalQuestions
        }
      }));
    });

    newSocket.on('student_started', (data: any) => {
      setStudents(prev => {
        const student = prev[data.studentId];
        if (!student) return prev;
        return {
          ...prev,
          [data.studentId]: {
            ...student,
            status: 'IN_PROGRESS',
            startedAt: data.startedAt
          }
        };
      });
    });

    newSocket.on('student_progress', (data: any) => {
      setStudents(prev => {
        const student = prev[data.studentId];
        if (!student) return prev;
        return {
          ...prev,
          [data.studentId]: {
            ...student,
            answeredCount: data.answeredCount,
            status: 'IN_PROGRESS'
          }
        };
      });
    });

    newSocket.on('student_submitted', (data: any) => {
      setStudents(prev => {
        const student = prev[data.studentId];
        if (!student) return prev;
        return {
          ...prev,
          [data.studentId]: {
            ...student,
            status: 'SUBMITTED',
            score: data.score,
            timeSpent: data.timeSpent
          }
        };
      });
      toast.success(`${data.user?.profile?.firstName || 'Un alumno'} acaba de entregar.`);
    });

    return () => {
      newSocket.emit('leave_exam_room', examId);
      newSocket.disconnect();
    };
  }, [examId, token]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Convertimos map a array y ordenamos dinámicamente
  const sortedStudents = useMemo(() => {
    return Object.values(students).sort((a, b) => {
      // 1. Ya entregados van primero que los en progreso (para un tablero final) o los que tienen score
      const aScore = a.score ?? 0;
      const bScore = b.score ?? 0;
      
      if (aScore !== bScore) {
        return bScore - aScore; // Mayor puntaje primero
      }
      
      // Si el puntaje es igual, desempate por avance (preguntas respondidas)
      const aAdv = a.answeredCount / Math.max(a.totalQuestions, 1);
      const bAdv = b.answeredCount / Math.max(b.totalQuestions, 1);
      if (aAdv !== bAdv) {
        return bAdv - aAdv;
      }
      
      // Si el avance es igual, desempate por tiempo (menor tiempo = mejor)
      if (a.timeSpent && b.timeSpent) {
         return a.timeSpent - b.timeSpent;
      }

      return 0;
    });
  }, [students]);

  const formatTime = (ms: number) => {
    if (!ms) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2Icon className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 font-sans">
      {/* Header Premium */}
      <header className="relative overflow-hidden border-b border-border/40 bg-card/30 backdrop-blur-2xl px-8 py-6 flex items-center justify-between z-20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          {!isFullscreen && (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={onBack}>
              <ArrowLeftIcon className="size-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold uppercase tracking-widest text-xs mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              En Vivo
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{examTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex flex-col items-end">
            <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Participantes</span>
            <span className="text-2xl font-bold flex items-center gap-2">
              <UsersIcon className="size-5 text-foreground0" />
              {sortedStudents.length}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="bg-secondary/50 border-border text-foreground hover:bg-secondary">
            {isFullscreen ? <MinimizeIcon className="size-5" /> : <ExpandIcon className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full relative z-0 flex flex-col lg:flex-row p-4 gap-6">
        
        {/* Scoreboard List */}
        <div className="flex-1 grid gap-3 relative z-10 w-full lg:w-3/4">
          {/* Glow Effects */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-foreground0">
            <div className="col-span-1 text-center">Rango</div>
            <div className="col-span-5">Participante</div>
            <div className="col-span-3 text-center">Avance</div>
            <div className="col-span-1 text-center">Tiempo</div>
            <div className="col-span-2 text-right">Puntaje</div>
          </div>

          {/* Rows (Dynamic order with CSS transitions) */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {sortedStudents.map((student, index) => {
                const profile = student.user.profile;
                const name = profile ? `${profile.firstName} ${profile.lastName}` : student.user.email;
                const institution = profile?.institution || 'Sin institución';
                const isTop3 = index < 3;
                const progressPercentage = student.totalQuestions > 0 ? (student.answeredCount / student.totalQuestions) * 100 : 0;
                const isSubmitted = student.status === 'SUBMITTED';

                return (
                  <motion.div
                    key={student.studentId}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: isTop3 ? 1.01 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -30 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                    style={{ zIndex: sortedStudents.length - index }}
                  >
                    <Card 
                      className={`
                        border border-border/30 overflow-hidden transition-all duration-500
                        ${isTop3 ? 'bg-card/60 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl' : 'bg-card/20 opacity-90 backdrop-blur-md hover:bg-card/40'}
                        ${index === 0 ? 'ring-1 ring-yellow-400/50 shadow-yellow-500/20' : ''}
                        ${index === 1 ? 'ring-1 ring-slate-300/50 shadow-slate-400/20' : ''}
                        ${index === 2 ? 'ring-1 ring-amber-600/50 shadow-amber-700/20' : ''}
                      `}
                    >
                  <div className="grid grid-cols-12 gap-4 items-center px-6 py-4 relative">
                    
                    {/* Rank */}
                    <div className="col-span-1 flex justify-center">
                      {isTop3 ? (
                        <div className={`
                          flex items-center justify-center size-10 rounded-full
                          ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950' : ''}
                          ${index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-foreground' : ''}
                          ${index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50' : ''}
                        `}>
                          <TrophyIcon className="size-5" />
                        </div>
                      ) : (
                        <div className="text-2xl font-black text-muted-foreground font-mono">{index + 1}</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="col-span-5 flex flex-col">
                      <span className={`text-lg font-bold truncate ${isTop3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {name}
                      </span>
                      <span className="text-sm text-foreground0 truncate">{institution}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="col-span-3 flex flex-col justify-center px-4">
                      <div className="flex justify-between text-xs font-mono mb-1.5 text-muted-foreground">
                        <span>{student.answeredCount} / {student.totalQuestions}</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out ${isSubmitted ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div className="col-span-1 flex justify-center items-center font-mono text-muted-foreground text-sm">
                      <ClockIcon className="size-4 mr-1.5 opacity-50" />
                      {isSubmitted 
                        ? formatTime(student.timeSpent) 
                        : student.startedAt 
                          ? formatTime(Math.max(0, now - new Date(student.startedAt).getTime())) 
                          : '--:--'
                      }
                    </div>

                    {/* Score */}
                    <div className="col-span-2 text-right">
                      {isSubmitted ? (
                        <span className={`text-3xl font-black font-mono tracking-tighter ${index === 0 ? 'text-yellow-400' : 'text-foreground'}`}>
                          {student.score?.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xl font-medium text-muted-foreground font-mono uppercase text-sm tracking-widest">
                          Evaluando
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
              );
            })}
            </AnimatePresence>

            {sortedStudents.length === 0 && (
              <div className="text-center py-20 text-foreground0 border border-dashed border-border rounded-xl bg-card/20">
                <UsersIcon className="size-12 mx-auto mb-4 opacity-20" />
                <p>Nadie se ha unido a este examen todavía.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fraud Log Sidebar */}
        <div className="w-full lg:w-96 shrink-0 relative z-10 rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-card/50 flex flex-col lg:h-[calc(100vh-140px)] sticky top-6">
          <FraudLog examId={examId} onBack={() => {}} />
        </div>
      </main>
    </div>
  );
}
