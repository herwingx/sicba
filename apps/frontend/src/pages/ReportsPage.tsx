import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { BarChartIcon, Loader2Icon, TrendingUpIcon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente ReportsPage
 * 
 * Interfaz analítica para administradores. Muestra estadísticas globales
 * del sistema mediante gráficos generados con `recharts`.
 * 
 * Contiene:
 * - Un gráfico de Radar mostrando el rendimiento promedio por materia.
 * - Un gráfico de Línea que rastrea el número de participaciones a lo largo del tiempo.
 * 
 * @returns {JSX.Element} Panel de reportes estadísticos.
 */
export function ReportsPage() {
  const [data, setData] = useState<{ radarData: any[], lineData: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchReports();
  }, []);

  /**
   * Carga los datos procesados para los gráficos desde el backend.
   */
  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/stats/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setData(json);
    } catch {
      toast.error('Error al cargar datos de reportes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <BarChartIcon className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes de Rendimiento</h1>
          <p className="text-sm text-muted-foreground">Análisis de calificaciones por materia y tendencias en el tiempo.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || (data.radarData.length === 0 && data.lineData.length === 0) ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          <TrendingUpIcon className="size-10 mb-2 opacity-20" />
          <p>No hay suficientes datos de exámenes para generar reportes.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico Radar - Desempeño por Materia */}
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Materia</CardTitle>
              <CardDescription>Promedio global de calificaciones en cada área evaluada.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radarData}>
                    <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar
                      name="Promedio"
                      dataKey="promedio"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.4}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Línea - Tendencia de Resultados */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Resultados</CardTitle>
              <CardDescription>Promedio de calificaciones en los últimos exámenes finalizados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="promedio"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
