import { useState, useEffect } from 'react'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { UserIcon, GraduationCapIcon } from 'lucide-react'

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

export function StudentsPage() {
  const token = localStorage.getItem('sicba_token')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

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
      } catch {
        /* silencioso */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alumnos</h1>
        <p className="text-sm text-muted-foreground">
          Lista de alumnos registrados en el sistema.
        </p>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead className="text-center">Semestre</TableHead>
                  <TableHead>Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {s.firstName && s.lastName
                        ? `${s.firstName} ${s.lastName}`
                        : <span className="text-muted-foreground italic">Sin perfil</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell>
                      {s.career
                        ? <Badge variant="outline">{s.career}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {s.semester ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
