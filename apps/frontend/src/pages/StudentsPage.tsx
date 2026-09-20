import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from './students/data-table'
import { columns } from './students/columns'
import { UserIcon, GraduationCapIcon, Trash2Icon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const API = 'http://localhost:3000'

interface Student {
  id: string
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  career: string | null
  semester: number | null
  createdAt: string
}

/**
 * Página de listado de alumnos.
 * Muestra a los usuarios registrados en el sistema con el rol "ALUMNO".
 */
export function StudentsPage() {
  const token = localStorage.getItem('sicba_token')
  const role = localStorage.getItem('sicba_role')
  const isAdmin = role === 'ADMIN'

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [regOpen, setRegOpen] = useState(false)
  const [regLoading, setRegLoading] = useState(true) // true mientras carga el setting del API
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [isPurging, setIsPurging] = useState(false)

  /**
   * Fetch inicial de los datos:
   * Hook useEffect que se dispara al montar el componente para obtener los alumnos del API.
   * Controla el estado `loading` y atrapa errores silenciosamente para no romper la UI.
   */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/users?role=ALUMNO`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setStudents(Array.isArray(data) ? data : [])
        }

        if (isAdmin) {
          const sRes = await fetch(`${API}/api/settings/registration`)
          if (sRes.ok) {
            const sData = await sRes.json()
            setRegOpen(sData.isOpen)
          }
          setRegLoading(false)
        }
      } catch {
        /* silencioso */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, isAdmin])

  const handleToggleRegistration = async (checked: boolean) => {
    setRegOpen(checked)
    try {
      const res = await fetch(`${API}/api/settings/registration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isOpen: checked })
      })
      if (!res.ok) {
        setRegOpen(!checked)
        toast.error('Error al actualizar configuración')
      } else {
        toast.success(checked ? 'Registros Abiertos' : 'Registros Cerrados')
      }
    } catch {
      setRegOpen(!checked)
      toast.error('Error de conexión')
    }
  }

  const handlePurge = async () => {
    setIsPurging(true)
    try {
      const res = await fetch(`${API}/api/users/purge`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setStudents([])
      } else {
        toast.error(data.error || 'Error al purgar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsPurging(false)
      setPurgeOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
          <p className="text-sm text-muted-foreground">
            Lista de alumnos registrados en el sistema.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {regLoading ? (
                <Skeleton className="h-6 w-11 rounded-full" />
              ) : (
                <Switch
                  id="reg-switch"
                  checked={regOpen}
                  onCheckedChange={handleToggleRegistration}
                  aria-label="Permitir nuevos registros de alumnos"
                />
              )}
              <label htmlFor="reg-switch" className="text-sm font-medium leading-none cursor-pointer select-none">
                {regLoading ? 'Cargando...' : regOpen ? 'Registros abiertos' : 'Registros cerrados'}
              </label>
            </div>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            <Button variant="destructive" size="sm" onClick={() => setPurgeOpen(true)}>
              <Trash2Icon className="size-4 mr-2" />
              Purgar Alumnos
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Purgar todos los alumnos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará de forma <b>irreversible</b> a todos los usuarios con rol de Alumno de la base de datos, junto con sus participaciones en exámenes. <br/><br/>
              Utiliza esta opción únicamente al finalizar un ciclo escolar o evento para limpiar la base de datos para el siguiente año.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handlePurge} disabled={isPurging}>
              {isPurging ? 'Eliminando...' : 'Sí, Purgar Base de Datos'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5 text-primary" />
            Alumnos registrados
            {!loading && (
              <Badge variant="secondary" className="ml-auto">{students.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Alumnos que pueden acceder y participar en los concursos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <GraduationCapIcon className="size-10 opacity-30" />
              <p className="text-sm">No hay alumnos registrados aún.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={students} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
