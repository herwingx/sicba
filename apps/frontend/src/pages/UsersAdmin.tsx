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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2Icon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente UsersAdmin
 * 
 * Interfaz de administración para visualizar el padrón completo de usuarios.
 * Permite filtrar por roles (Administrador, Maestro, Alumno) y muestra datos
 * específicos como carrera o semestre cuando aplica.
 * 
 * Sustituye a la anterior página exclusiva de alumnos para centralizar la gestión de identidades.
 * 
 * @returns {JSX.Element} La tabla de usuarios.
 */
export function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchUsers(roleFilter);
  }, [roleFilter]);

  /**
   * Carga la lista de usuarios desde la API.
   * Si se especifica un rol distinto a 'ALL', se agrega como query param para filtrado.
   * 
   * @param {string} role - El rol a filtrar ('ALL', 'ADMIN', 'MAESTRO', 'ALUMNO')
   */
  const fetchUsers = async (role: string) => {
    setLoading(true);
    try {
      const url = role === 'ALL' 
        ? 'http://localhost:3000/api/users' 
        : `http://localhost:3000/api/users?role=${role}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge variant="destructive">Admin</Badge>;
      case 'MAESTRO': return <Badge variant="default">Maestro</Badge>;
      case 'ALUMNO': return <Badge variant="secondary">Alumno</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Consulta el padrón de alumnos, maestros y administradores del sistema.
          </p>
        </div>
        <div className="w-48">
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || 'ALL')}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los roles</SelectItem>
              <SelectItem value="ALUMNO">Alumnos</SelectItem>
              <SelectItem value="MAESTRO">Maestros</SelectItem>
              <SelectItem value="ADMIN">Administradores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            Padrón de Usuarios ({users.length})
          </CardTitle>
          <CardDescription>Lista completa de cuentas registradas en la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Carrera / Semestre</TableHead>
                  <TableHead className="text-right">Fecha de Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2Icon className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No se encontraron usuarios con este filtro.
                    </TableCell>
                  </TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName ? `${user.firstName} ${user.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{formatRole(user.role)}</TableCell>
                    <TableCell className="text-sm">
                      {user.career ? `${user.career} (${user.semester}º)` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
