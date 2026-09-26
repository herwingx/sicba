import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, PlusCircleIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Representa una materia o asignatura dentro del catálogo académico.
 * @interface Subject
 */
export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    questions: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Estructura de datos para el formulario de creación o edición de una materia.
 * @interface SubjectFormData
 */
export interface SubjectFormData {
  name: string;
  description: string;
}

/**
 * Componente SubjectsAdmin
 * 
 * Vista de administración para el catálogo de materias (asignaturas) en SICBA.
 * Permite:
 * - Visualizar la lista de materias registradas junto con el total de preguntas asociadas.
 * - Registrar nuevas materias mediante un panel lateral (Sheet).
 * - Editar materias existentes.
 * - Eliminar materias (con restricción de integridad para aquellas con reactivos asociados).
 * 
 * @returns {JSX.Element} Panel de administración de materias.
 */
export function SubjectsAdmin() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SubjectFormData>({ name: '', description: '' });

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchSubjects();
  }, []);

  /**
   * Realiza una petición GET para cargar el catálogo de materias desde el backend.
   * Gestiona los estados de carga y reporta anomalías mediante alertas toast.
   */
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar materias');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restablece el formulario a su estado inicial y abre el panel lateral (Sheet) para dar de alta una nueva materia.
   */
  const openNewSheet = () => {
    setEditingSubject(null);
    setFormData({ name: '', description: '' });
    setIsSheetOpen(true);
  };

  /**
   * Llena el formulario con los datos de la materia seleccionada y despliega el panel lateral para su edición.
   * 
   * @param {Subject} s - Objeto de la materia que se desea modificar.
   */
  const openEditSheet = (s: Subject) => {
    setEditingSubject(s);
    setFormData({ name: s.name, description: s.description || '' });
    setIsSheetOpen(true);
  };

  /**
   * Envía la solicitud DELETE para eliminar la materia identificada en `subjectToDelete`.
   * Muestra un mensaje de éxito o notifica el motivo de rechazo (por ejemplo, si tiene preguntas vinculadas).
   */
  const handleDelete = async () => {
    if (!subjectToDelete) return;
    try {
      const res = await fetch(`http://localhost:3000/api/subjects/${subjectToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar');
      }
      toast.success('Materia eliminada');
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubjectToDelete(null);
    }
  };

  /**
   * Valida y procesa el guardado de la materia (POST para nueva materia o PATCH para actualizar existente).
   * Cierra el panel lateral y refresca la lista al completarse exitosamente.
   */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const url = editingSubject 
        ? `http://localhost:3000/api/subjects/${editingSubject.id}`
        : 'http://localhost:3000/api/subjects';
      
      const res = await fetch(url, {
        method: editingSubject ? 'PATCH' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error();
      toast.success(editingSubject ? 'Materia actualizada' : 'Materia creada');
      setIsSheetOpen(false);
      fetchSubjects();
    } catch {
      toast.error('Error al guardar materia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Materias Registradas</CardTitle>
            <CardDescription>Catálogo de materias disponibles para exámenes y reactivos.</CardDescription>
          </div>
          <Button onClick={openNewSheet}>
            <PlusCircleIcon data-icon="inline-start" />
            Nueva Materia
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-1/3">Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-24 text-center">Reactivos</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2Icon className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay materias registradas.
                    </TableCell>
                  </TableRow>
                ) : subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.description || 'Sin descripción'}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{s._count?.questions || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditSheet(s)}>
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setSubjectToDelete(s.id)}>
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingSubject ? 'Editar Materia' : 'Nueva Materia'}</SheetTitle>
            <SheetDescription>Configura los detalles de la materia.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-6 px-4 sm:px-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Nombre de la materia</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Ej. Cálculo Diferencial" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Descripción (Opcional)</label>
              <Input 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Ej. Tronco común, 1er Semestre" 
              />
            </div>
          </div>
          <SheetFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 px-4 pb-4">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Guardar Materia
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que deseas eliminar esta materia?</AlertDialogTitle>
            <AlertDialogDescription>
              No se puede deshacer. Sólo puedes eliminar materias que no tengan reactivos (preguntas) asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
