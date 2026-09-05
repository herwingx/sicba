import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  TrendingUpIcon,
} from 'lucide-react'

const stats = [
  {
    title: 'Banco de Reactivos',
    value: '248',
    description: 'Preguntas registradas en el sistema',
    icon: BookOpenIcon,
    trend: '+12 esta semana',
  },
  {
    title: 'Exámenes Activos',
    value: '3',
    description: 'Concursos en ejecución o programados',
    icon: ClipboardListIcon,
    trend: '1 en progreso ahora',
  },
  {
    title: 'Alumnos Registrados',
    value: '124',
    description: 'Participantes habilitados en el sistema',
    icon: GraduationCapIcon,
    trend: '+8 nuevos registros',
  },
  {
    title: 'Promedio General',
    value: '74.3%',
    description: 'Calificación promedio del último concurso',
    icon: TrendingUpIcon,
    trend: '+2.1% vs. mes anterior',
  },
]

export function DashboardHome() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-sm text-muted-foreground">
          Resumen general del Sistema Integral de Ciencias Básicas
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                <Badge variant="secondary" className="mt-3 text-xs">
                  {stat.trend}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bienvenido a SICBA</CardTitle>
          <CardDescription>
            Usa el menú lateral para navegar entre las secciones del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Banco de Reactivos:</strong> Crea, edita y carga masivamente preguntas matemáticas con soporte LaTeX.</li>
            <li><strong>Exámenes:</strong> Crea y programa concursos de Ciencias Básicas con control de tiempo.</li>
            <li><strong>Alumnos:</strong> Gestiona el padrón de participantes y sus resultados.</li>
            <li><strong>Reportes:</strong> Visualiza estadísticas de desempeño por materia y grupo.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
