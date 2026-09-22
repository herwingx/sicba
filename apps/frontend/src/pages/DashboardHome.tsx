import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  TrendingUpIcon,
  AwardIcon,
  ActivityIcon
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Interfaz que define las métricas globales y personales mostradas en el Dashboard.
 * @interface DashboardStats
 */
interface DashboardStats {
  totalQuestions?: number;
  activeExams?: number;
  totalStudents?: number;
  averageScore?: number;
  completedExams?: number;
  totalExams?: number; // Para alumno
}

/**
 * Componente principal del Dashboard.
 * 
 * Este panel actúa como la página de inicio tras iniciar sesión. 
 * Realiza una petición GET al endpoint `/api/stats` para recuperar las métricas
 * pertinentes al rol del usuario actual (Administrador o Alumno).
 * Muestra las estadísticas en tarjetas (Cards) y da una bienvenida informativa.
 * 
 * @returns {JSX.Element} El componente DashboardHome
 */
export function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const role = localStorage.getItem('sicba_role');
  const isAdmin = role === 'ADMIN' || role === 'MAESTRO';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('sicba_token');
        const res = await fetch('http://localhost:3000/api/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Error al cargar métricas');
        
        const data = await res.json();
        setStats(data);
      } catch (error) {
        toast.error('No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminCards = [
    {
      title: 'Banco de Reactivos',
      value: stats?.totalQuestions ?? 0,
      description: 'Preguntas registradas en el sistema',
      icon: BookOpenIcon,
      trend: 'Total activo',
    },
    {
      title: 'Exámenes Activos',
      value: stats?.activeExams ?? 0,
      description: 'Concursos en ejecución o programados',
      icon: ClipboardListIcon,
      trend: 'En progreso',
    },
    {
      title: 'Alumnos Registrados',
      value: stats?.totalStudents ?? 0,
      description: 'Participantes habilitados en el sistema',
      icon: GraduationCapIcon,
      trend: 'Padrón actual',
    },
    {
      title: 'Promedio General',
      value: `${(stats?.averageScore ?? 0).toFixed(1)}%`,
      description: 'Calificación promedio global',
      icon: TrendingUpIcon,
      trend: 'Histórico',
    },
  ];

  const studentCards = [
    {
      title: 'Exámenes Disponibles',
      value: stats?.totalExams ?? 0,
      description: 'Exámenes activos en este momento',
      icon: ActivityIcon,
      trend: 'Disponibles',
    },
    {
      title: 'Exámenes Completados',
      value: stats?.completedExams ?? 0,
      description: 'Tus participaciones finalizadas',
      icon: ClipboardListIcon,
      trend: 'Finalizados',
    },
    {
      title: 'Mi Promedio General',
      value: `${(stats?.averageScore ?? 0).toFixed(1)}%`,
      description: 'Tu rendimiento histórico',
      icon: AwardIcon,
      trend: 'Global',
    }
  ];

  const currentCards = isAdmin ? adminCards : studentCards;

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Métricas en tiempo real del sistema SICBA' : 'Tu resumen personal de desempeño'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {currentCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16 mb-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                {!loading && (
                  <Badge variant="secondary" className="mt-4 text-[10px] uppercase tracking-wider font-semibold">
                    {stat.trend}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 border-border/50 bg-linear-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">Bienvenido a SICBA</CardTitle>
          <CardDescription>
            Sistema Integral de Ciencias Básicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            {isAdmin ? (
              <>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Banco de Reactivos:</strong> Administra el catálogo de preguntas con soporte LaTeX y carga masiva por Excel.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Exámenes:</strong> Genera concursos, controla estados de publicación y monitorea el avance en tiempo real.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Estudiantes:</strong> Gestiona el padrón y resultados. Al final del ciclo, puedes depurar la base de datos.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Reportes:</strong> Visualiza estadísticas de desempeño y analiza resultados globales por materia.</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Exámenes Disponibles:</strong> Usa el menú lateral para ver e ingresar a los concursos que están activos.</p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <p><strong className="text-foreground">Resultados:</strong> Al entregar un examen, podrás ver tu calificación y el desglose de retroalimentación.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
