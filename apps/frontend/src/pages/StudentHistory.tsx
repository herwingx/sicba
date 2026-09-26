import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, ClockIcon, AwardIcon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente StudentHistory
 * 
 * Interfaz exclusiva para alumnos que muestra el kardex o historial de exámenes en los
 * que ha participado, con sus respectivas calificaciones y estado.
 * 
 * @returns {JSX.Element} Historial de participaciones del alumno.
 */
export function StudentHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchHistory();
  }, []);

  /**
   * Obtiene la lista de participaciones históricas del usuario.
   */
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/exams?history=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setHistory(data);
    } catch {
      toast.error('Error al cargar tu historial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:max-w-5xl">
      <div className="flex items-center gap-3">
        <AwardIcon className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kardex de Evaluaciones</h1>
          <p className="text-sm text-muted-foreground">Tu historial de exámenes presentados en SICBA</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>
            Resultados de las participaciones que has concluido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Materia / Examen</TableHead>
                  <TableHead className="text-center">Tiempo de Ejecución</TableHead>
                  <TableHead className="text-right">Calificación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2Icon className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aún no tienes exámenes finalizados.
                    </TableCell>
                  </TableRow>
                ) : history.map((exam) => {
                  const score = exam.myParticipation?.score ?? 0;
                  const isPassing = score >= 70;
                  // Simularemos que el timestamp the finalizacion fue el mismo dia para demo
                  const finishDate = new Date(exam.endTime);

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {finishDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{exam.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">{exam.subject?.name}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm font-mono flex flex-col items-center justify-center">
                        <ClockIcon className="size-3.5 mb-1" />
                        {exam.timeLimit} min máx.
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-lg font-bold ${isPassing ? 'text-primary' : 'text-destructive'}`}>
                          {score.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
