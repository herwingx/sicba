import { useState, useRef, useEffect } from 'react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UploadCloudIcon,
  PlusCircleIcon,
  Loader2Icon,
  FileSpreadsheetIcon,
  Pencil,
  Trash2,
  DownloadIcon,
  XIcon,
  GraduationCapIcon,
  BookOpenIcon
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { SubjectsAdmin } from './SubjectsAdmin';

/**
 * Representa una opción de respuesta para una pregunta o reactivo.
 * @interface QuestionOption
 */
export interface QuestionOption {
  id?: string;
  content: string;
  isCorrect: boolean;
}

/**
 * Representa una pregunta o reactivo del banco de reactivos.
 * @interface Question
 */
export interface Question {
  id: string;
  subjectId: string;
  content: string;
  difficulty: number;
  explanation?: string | null;
  subject?: {
    id: string;
    name: string;
  };
  options: QuestionOption[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representa la materia o asignatura asociada a los reactivos.
 * @interface Subject
 */
export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    questions: number;
  };
}

/**
 * Estructura de datos utilizada en el formulario para crear o editar un reactivo.
 * @interface QuestionFormData
 */
export interface QuestionFormData {
  subjectId: string;
  content: string;
  difficulty: number;
  explanation: string;
  options: QuestionOption[];
}

/**
 * Configuración visual y descriptiva para las etiquetas de dificultad de un reactivo.
 * @interface DifficultyBadgeConfig
 */
export interface DifficultyBadgeConfig {
  label: string;
  variant: 'secondary' | 'default' | 'destructive' | 'outline';
}

/**
 * Mapeo de niveles de dificultad numérica a sus etiquetas legibles y variantes de Badge para la interfaz de usuario.
 */
const DIFFICULTY_LABELS: Record<number, DifficultyBadgeConfig> = {
  1: { label: 'Básico', variant: 'secondary' },
  2: { label: 'Medio', variant: 'default' },
  3: { label: 'Avanzado', variant: 'destructive' },
};

/**
 * Componente QuestionsAdmin
 * 
 * Vista de administración para el banco de reactivos (preguntas) del sistema SICBA.
 * Proporciona capacidades para:
 * - Listar preguntas registradas con soporte de renderizado para fórmulas matemáticas (LaTeX).
 * - Crear y editar preguntas de opción múltiple de forma individual mediante un panel lateral (Sheet).
 * - Eliminar reactivos existentes con confirmación previa.
 * - Importar preguntas masivamente a través de archivos Excel (.xlsx) o CSV con plantilla descargable.
 * - Navegar entre la gestión de reactivos y la gestión de materias mediante pestañas.
 * 
 * @returns {JSX.Element} Panel de administración de reactivos.
 */
export function QuestionsAdmin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<QuestionFormData>({
    subjectId: '',
    content: '',
    difficulty: 1,
    explanation: '',
    options: [
      { content: '', isCorrect: true },
      { content: '', isCorrect: false }
    ]
  });

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Obtiene de forma asíncrona la lista de reactivos y materias disponibles desde el backend.
   * Actualiza los estados locales de preguntas y materias, gestionando indicadores de carga y errores.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resQ, resS] = await Promise.all([
        fetch('http://localhost:3000/api/questions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:3000/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const dataQ = await resQ.json();
      const dataS = await resS.json();
      setQuestions(Array.isArray(dataQ) ? dataQ : []);
      setSubjects(Array.isArray(dataS) ? dataS : []);
    } catch {
      toast.error('Error al cargar datos del servidor');
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk Upload ---
  /**
   * Maneja el evento de soltar (drop) un archivo sobre la zona designada para carga masiva.
   * 
   * @param {React.DragEvent} e - Evento de arrastre y soltado de archivos.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  /**
   * Envía el archivo seleccionado (.xlsx o .csv) al servidor para importar preguntas de forma masiva.
   * Procesa la respuesta HTTP, muestra notificaciones toast con el resultado y actualiza la lista de reactivos.
   */
  const handleBulkUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('http://localhost:3000/api/questions/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error procesando el archivo');
      } else {
        toast.success(data.message);
        setSelectedFile(null);
        fetchData();
      }
    } catch {
      toast.error('No se pudo conectar con el backend.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Descarga la plantilla oficial en formato de hoja de cálculo (.xlsx) requerida para la carga masiva.
   */
  const downloadTemplate = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/questions/template', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_reactivos_sicba.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error descargando la plantilla');
    }
  };

  // --- CRUD Individual ---
  /**
   * Inicializa el formulario con valores por defecto y abre el panel lateral (Sheet) para dar de alta un nuevo reactivo.
   */
  const openNewSheet = () => {
    setEditingQuestion(null);
    setFormData({
      subjectId: subjects.length > 0 ? subjects[0].id : '',
      content: '',
      difficulty: 1,
      explanation: '',
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ]
    });
    setIsSheetOpen(true);
  };

  /**
   * Carga la información de un reactivo existente en el formulario y abre el panel lateral para su modificación.
   * 
   * @param {Question} q - Objeto del reactivo seleccionado para edición.
   */
  const openEditSheet = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      subjectId: q.subjectId,
      content: q.content,
      difficulty: q.difficulty,
      explanation: q.explanation || '',
      options: q.options.map((o) => ({ content: o.content, isCorrect: o.isCorrect }))
    });
    setIsSheetOpen(true);
  };

  /**
   * Elimina de forma permanente el reactivo seleccionado en el diálogo de confirmación y recarga la lista.
   */
  const handleDelete = async () => {
    if (!questionToDelete) return;
    try {
      const res = await fetch(`http://localhost:3000/api/questions/${questionToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Reactivo eliminado');
      fetchData();
    } catch {
      toast.error('Error al eliminar el reactivo');
    } finally {
      setQuestionToDelete(null);
    }
  };

  /**
   * Valida y guarda los datos del reactivo (creación con POST o edición con PATCH).
   * Comprueba que los campos requeridos estén completos y que exista exactamente una opción marcada como correcta.
   */
  const handleSave = async () => {
    if (!formData.subjectId || !formData.content || formData.options.some(o => !o.content.trim())) {
      toast.error('Llena todos los campos y opciones');
      return;
    }
    if (!formData.options.some(o => o.isCorrect)) {
      toast.error('Debes marcar al menos una opción como correcta');
      return;
    }

    setSaving(true);
    try {
      const url = editingQuestion 
        ? `http://localhost:3000/api/questions/${editingQuestion.id}`
        : 'http://localhost:3000/api/questions';
      
      const res = await fetch(url, {
        method: editingQuestion ? 'PATCH' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error();
      toast.success(editingQuestion ? 'Reactivo actualizado' : 'Reactivo creado');
      setIsSheetOpen(false);
      fetchData();
    } catch {
      toast.error('Error al guardar el reactivo');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Actualiza el contenido o el estado de acierto de una opción de respuesta en el formulario.
   * Si se marca una opción como correcta (`isCorrect: true`), desmarca automáticamente todas las demás opciones.
   * 
   * @param {number} index - Posición de la opción dentro del arreglo en el estado.
   * @param {string} field - Propiedad a modificar ('content' | 'isCorrect').
   * @param {any} value - Nuevo valor que se asignará al campo.
   */
  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...formData.options];
    if (field === 'isCorrect' && value === true) {
      // Hacer exclusiva la respuesta correcta
      newOptions.forEach(o => o.isCorrect = false);
    }
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de Reactivos</h1>
          <p className="text-sm text-muted-foreground">
            Administra las preguntas del sistema de exámenes SICBA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <DownloadIcon data-icon="inline-start" />
            Descargar Plantilla
          </Button>
          <Button onClick={openNewSheet}>
            <PlusCircleIcon data-icon="inline-start" />
            Nuevo Reactivo
          </Button>
        </div>
      </div>

      {/* Contenedor de Pestañas: Reactivos / Materias */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <BookOpenIcon className="size-4" />
            Reactivos
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <GraduationCapIcon className="size-4" />
            Materias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="flex flex-col gap-6 outline-none">
          {/* Bulk Upload Section */}
          <Card className="bg-card/50">
            <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheetIcon className="size-5 text-primary" />
            Carga Masiva de Reactivos
          </CardTitle>
          <CardDescription>
            Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con el formato de plantilla
            para importar múltiples preguntas de una sola vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10
              cursor-pointer transition-all duration-200
              ${dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/50'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <UploadCloudIcon className={`size-10 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            {selectedFile ? (
              <div className="text-center">
                <p className="font-semibold text-primary">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB — Listo para procesar</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">Formatos aceptados: .xlsx, .csv</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleBulkUpload}
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto self-start"
          >
            {uploading ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <UploadCloudIcon data-icon="inline-start" />
            )}
            {uploading ? 'Procesando...' : 'Procesar y Cargar'}
          </Button>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reactivos Registrados ({questions.length})</CardTitle>
          <CardDescription>
            Vista previa del banco de preguntas con renderizado LaTeX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Materia</TableHead>
                  <TableHead>Pregunta (LaTeX)</TableHead>
                  <TableHead className="w-28 text-center">Dificultad</TableHead>
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
                ) : questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay reactivos registrados. Añade uno o sube un archivo Excel.
                    </TableCell>
                  </TableRow>
                ) : questions.map((q) => {
                  const diff = DIFFICULTY_LABELS[q.difficulty] || DIFFICULTY_LABELS[1];
                  return (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Badge variant="outline" className="truncate max-w-[120px]">{q.subject?.name}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        <div className="line-clamp-2">
                          <Latex>{q.content}</Latex>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={diff.variant} className="text-[10px] uppercase">{diff.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditSheet(q)}>
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setQuestionToDelete(q.id)}>
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="subjects" className="outline-none">
        <SubjectsAdmin />
      </TabsContent>
      </Tabs>

      {/* Editor Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingQuestion ? 'Editar Reactivo' : 'Nuevo Reactivo'}</SheetTitle>
            <SheetDescription>
              Configura el contenido y las opciones de respuesta. Puedes usar sintaxis LaTeX.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">Materia</Label>
                <Select value={formData.subjectId} onValueChange={(v) => setFormData({...formData, subjectId: v || ''})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Dificultad (1-3)</label>
                <Select value={String(formData.difficulty)} onValueChange={(v) => setFormData({...formData, difficulty: Number(v)})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dificultad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Básico</SelectItem>
                    <SelectItem value="2">2 - Medio</SelectItem>
                    <SelectItem value="3">3 - Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium flex justify-between">
                <span>Pregunta (Soporta LaTeX)</span>
              </label>
              <Textarea 
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                placeholder="Ej. Calcula: $$ \lim_{x \to 0} \frac{\sin(x)}{x} $$"
                className="min-h-[100px] font-mono text-sm"
              />
              {formData.content && (
                <div className="p-3 bg-muted/50 rounded-md border mt-1">
                  <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                  <div className="text-sm"><Latex>{formData.content}</Latex></div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Opciones de Respuesta</label>
              <div className="flex flex-col gap-2">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-md bg-card/50">
                    <Switch 
                      checked={opt.isCorrect} 
                      onCheckedChange={(v) => handleOptionChange(i, 'isCorrect', v)}
                    />
                    <Input 
                      value={opt.content}
                      onChange={e => handleOptionChange(i, 'content', e.target.value)}
                      placeholder={`Opción ${i + 1}`}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => {
                        const newOpts = [...formData.options];
                        newOpts.splice(i, 1);
                        setFormData({...formData, options: newOpts});
                      }}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {formData.options.length < 5 && (
                <Button variant="outline" size="sm" onClick={() => setFormData({...formData, options: [...formData.options, {content: '', isCorrect: false}]})}>
                  <PlusCircleIcon data-icon="inline-start" />
                  Agregar Opción
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Explicación (Opcional)</label>
              <Textarea 
                value={formData.explanation}
                onChange={e => setFormData({...formData, explanation: e.target.value})}
                placeholder="Se mostrará al alumno en la retroalimentación."
                className="h-20"
              />
            </div>
          </div>
          <SheetFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Guardar Reactivo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que deseas eliminar este reactivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El reactivo será removido permanentemente de la base de datos y de cualquier examen en borrador al que pertenezca.
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
