import { useState, useRef } from 'react';
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
  CheckCircle2Icon,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';

const SAMPLE_QUESTIONS = [
  {
    id: '001',
    subject: 'Cálculo',
    content: 'Calcula: $$ \\lim_{x \\to 0} \\frac{\\sin(x)}{x} $$',
    difficulty: 2,
  },
  {
    id: '002',
    subject: 'Álgebra',
    content: 'Resuelve la ecuación: $x^2 - 5x + 6 = 0$',
    difficulty: 1,
  },
  {
    id: '003',
    subject: 'Física',
    content: 'Calcula la energía cinética: $E_k = \\frac{1}{2}mv^2$ si $m = 5\\,kg$ y $v = 10\\,m/s$',
    difficulty: 3,
  },
  {
    id: '004',
    subject: 'Química',
    content: 'Balancea la reacción: $C_3H_8 + O_2 \\rightarrow CO_2 + H_2O$',
    difficulty: 2,
  },
]

const DIFFICULTY_LABELS: Record<number, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  1: { label: 'Básico', variant: 'secondary' },
  2: { label: 'Medio', variant: 'default' },
  3: { label: 'Avanzado', variant: 'destructive' },
}

export function QuestionsAdmin() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = localStorage.getItem('sicba_token')

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  const handleBulkUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch('http://localhost:3000/api/questions/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || 'Error procesando el archivo')
      } else {
        setUploadResult(data.message)
        setSelectedFile(null)
      }
    } catch {
      setUploadError('No se pudo conectar con el backend.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de Reactivos</h1>
          <p className="text-sm text-muted-foreground">
            Administra las preguntas del sistema de exámenes SICBA
          </p>
        </div>
        <Button>
          <PlusCircleIcon data-icon="inline-start" />
          Agregar Reactivo
        </Button>
      </div>

      {/* Bulk Upload Section */}
      <Card>
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
          {/* Drop Zone */}
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

          {/* Feedback */}
          {uploadResult && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2Icon className="size-4 shrink-0" />
              {uploadResult}
            </div>
          )}
          {uploadError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {uploadError}
            </div>
          )}

          <Button
            onClick={handleBulkUpload}
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto"
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
          <CardTitle>Reactivos Registrados</CardTitle>
          <CardDescription>
            Vista previa del banco de preguntas con renderizado LaTeX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-28">Materia</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead className="w-28">Dificultad</TableHead>
                <TableHead className="w-28 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_QUESTIONS.map((q) => {
                const diff = DIFFICULTY_LABELS[q.difficulty]
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.subject}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Latex>{q.content}</Latex>
                    </TableCell>
                    <TableCell>
                      <Badge variant={diff.variant}>{diff.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7">
                          <Eye className="size-3.5" />
                          <span className="sr-only">Ver</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7">
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
