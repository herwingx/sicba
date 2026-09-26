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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2Icon, UsersIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente UsersAdmin
 * 
 * Interfaz de administración para visualizar, editar y eliminar usuarios.
 * Permite filtrar por roles (Administrador, Maestro, Alumno).
 * 
 * Restricciones de seguridad:
 * - No se puede eliminar un usuario que tiene un examen en curso (IN_PROGRESS).
 * - No se puede eliminar la propia cuenta de administrador.
 * - Los correos duplicados son rechazados por el servidor.
 * 
 * @returns {JSX.Element} La tabla de usuarios con acciones.
 */
export function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Estado para edición
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSemester, setEditSemester] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Estado para eliminación
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('sicba_token');
  const currentUserEmail = localStorage.getItem('sicba_email');

  useEffect(() => {
    fetchUsers(roleFilter);
  }, [roleFilter]);

  /**
   * Carga la lista de usuarios desde la API.
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

  /**
   * Abre el modal de edición pre-llenando los campos con los datos del usuario.
   */
  const openEditDialog = (user: any) => {
    setEditUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditEmail(user.email || '');
    setEditSemester(user.semester ? user.semester.toString() : '');
    setEditPassword('');
    setEditOpen(true);
  };

  /**
   * Envía los cambios del usuario al servidor.
   */
  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editEmail,
          firstName: editFirstName,
          lastName: editLastName,
          semester: editSemester || null,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Usuario actualizado');
      setEditOpen(false);
      fetchUsers(roleFilter);
    } catch (error: any) {
      toast.error(error.message || 'Error al editar usuario');
    } finally {
      setEditSaving(false);
    }
  };

  /**
   * Abre la confirmación de eliminación.
   */
  const openDeleteDialog = (user: any) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  /**
   * Ejecuta la eliminación del usuario con validaciones del servidor.
   */
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:3000/api/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Usuario eliminado');
      setDeleteOpen(false);
      fetchUsers(roleFilter);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Consulta, edita o elimina cuentas de alumnos, maestros y administradores.
          </p>
        </div>
        <div className="w-48">
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || 'ALL')}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por rol">
                {roleFilter === 'ALL' ? 'Todos los roles' :
                 roleFilter === 'ALUMNO' ? 'Alumnos' :
                 roleFilter === 'MAESTRO' ? 'Maestros' :
                 roleFilter === 'ADMIN' ? 'Administradores' : roleFilter}
              </SelectValue>
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
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2Icon className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                      {user.career ? `${user.career} (${user.semester}º)` : user.semester ? `${user.semester}º Semestre` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.email === currentUserEmail ? (
                        <Badge variant="outline" className="text-xs">Tú</Badge>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} title="Editar usuario">
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(user)} title="Eliminar usuario">
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Modal de Edición ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos de <span className="font-semibold">{editUser?.email}</span>. Deja la contraseña vacía para no cambiarla.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">Nombre</Label>
                <Input id="editFirstName" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Apellidos</Label>
                <Input id="editLastName" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Correo Electrónico</Label>
              <Input id="editEmail" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            {editUser?.role === 'ALUMNO' && (
              <div className="space-y-2">
                <Label htmlFor="editSemester">Semestre</Label>
                <Select value={editSemester} onValueChange={setEditSemester}>
                  <SelectTrigger id="editSemester">
                    <SelectValue placeholder="Seleccionar semestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num}º Semestre</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editPassword">Nueva Contraseña</Label>
              <Input id="editPassword" type="password" placeholder="Dejar vacío para no cambiar" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Solo se actualiza si escribes algo aquí.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2Icon className="animate-spin mr-2" size={16} />}
              {editSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirmación de Eliminación ──────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <span className="font-semibold">{deleteUser?.firstName} {deleteUser?.lastName}</span> ({deleteUser?.email}).
              Esta acción es irreversible y eliminará todas sus participaciones, respuestas e historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2Icon className="animate-spin mr-2" size={16} />}
              {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
