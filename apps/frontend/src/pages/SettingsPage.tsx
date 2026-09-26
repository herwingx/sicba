import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
import { SettingsIcon, AlertTriangleIcon, Loader2Icon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente SettingsPage
 * 
 * Interfaz de administración para gestionar la configuración global del sistema SICBA.
 * Permite:
 * 1. Habilitar o deshabilitar el registro de nuevos usuarios (útil para cerrar inscripciones).
 * 2. Purgar la base de datos de usuarios (con validación de seguridad "PURGAR") para limpiar
 *    alumnos inactivos y prepararse para un nuevo ciclo escolar.
 * 
 * @returns {JSX.Element} El panel de configuración.
 */
export function SettingsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeAlertOpen, setPurgeAlertOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  // Estados para dominios
  const [domains, setDomains] = useState('');
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsSaving, setDomainsSaving] = useState(false);

  const token = localStorage.getItem('sicba_token');

  useEffect(() => {
    fetchSettings();
  }, []);

  /**
   * Carga el estado actual de los registros globales desde la API.
   */
  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/settings/registration');
      const data = await res.json();
      setIsOpen(data.isOpen);
    } catch {
      toast.error('Error al cargar configuración de registros');
    } finally {
      setLoading(false);
    }

    try {
      const resDom = await fetch('http://localhost:3000/api/settings/domains');
      const dataDom = await resDom.json();
      if (dataDom.domains) {
        setDomains(dataDom.domains.join(', '));
      }
    } catch {
      toast.error('Error al cargar dominios permitidos');
    } finally {
      setDomainsLoading(false);
    }
  };

  /**
   * Maneja el cambio de estado (toggle) para habilitar/deshabilitar nuevos registros.
   * Utiliza una UI optimista que revierte su estado si el endpoint falla.
   * 
   * @param {boolean} checked - El nuevo estado deseado del switch.
   */
  const handleToggleRegistration = async (checked: boolean) => {
    setIsOpen(checked); // Optimistic UI
    try {
      const res = await fetch('http://localhost:3000/api/settings/registration', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isOpen: checked })
      });
      if (!res.ok) throw new Error();
      toast.success(checked ? 'Registros habilitados' : 'Registros deshabilitados');
    } catch {
      setIsOpen(!checked); // Rollback
      toast.error('Error al cambiar la configuración');
    }
  };

  /**
   * Guarda los dominios permitidos para registro.
   */
  const handleSaveDomains = async () => {
    setDomainsSaving(true);
    try {
      // Convertir el texto a arreglo separando por comas
      const domainsArray = domains.split(',').map(d => d.trim()).filter(d => d);
      if (domainsArray.length === 0) {
        toast.error('Debes tener al menos un dominio permitido');
        return;
      }
      const res = await fetch('http://localhost:3000/api/settings/domains', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ domains: domainsArray })
      });
      if (!res.ok) throw new Error();
      toast.success('Dominios actualizados correctamente');
    } catch {
      toast.error('Error al guardar dominios');
    } finally {
      setDomainsSaving(false);
    }
  };

  /**
   * Petición de eliminación masiva (purga) de usuarios con rol ALUMNO.
   * Requiere que el input de confirmación sea exactamente 'PURGAR'.
   */
  const handlePurge = async () => {
    if (purgeConfirmText !== 'PURGAR') {
      toast.info('Escribe PURGAR para confirmar');
      return;
    }

    setPurging(true);
    setPurgeAlertOpen(false);
    try {
      const res = await fetch('http://localhost:3000/api/users/purge', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'Error al purgar la base de datos');
    } finally {
      setPurging(false);
      setPurgeConfirmText('');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 xl:max-w-[1600px] w-full mx-auto">
      <div className="flex items-center gap-2">
        <SettingsIcon className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes del Sistema</h1>
          <p className="text-sm text-muted-foreground">Configura los parámetros globales de SICBA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
        <CardHeader>
          <CardTitle>Control de Acceso</CardTitle>
          <CardDescription>
            Administra quién puede ingresar o registrarse en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Permitir Nuevos Registros</label>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, ningún alumno nuevo podrá crear una cuenta. Útil durante concursos activos.
              </p>
            </div>
            {loading ? (
              <Loader2Icon className="animate-spin text-muted-foreground size-5" />
            ) : (
              <Switch checked={isOpen} onCheckedChange={handleToggleRegistration} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dominios Permitidos</CardTitle>
          <CardDescription>
            Especifica qué dominios de correo pueden usarse para registrar cuentas de alumnos. Separa múltiples dominios por comas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input 
                value={domains} 
                onChange={(e) => setDomains(e.target.value)} 
                placeholder="Ej. @mina.tecnm.mx, @gmail.com" 
                disabled={domainsLoading || domainsSaving}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Los correos que no coincidan con estos dominios serán rechazados al intentar registrarse.
              </p>
            </div>
            <Button onClick={handleSaveDomains} disabled={domainsLoading || domainsSaving}>
              {domainsSaving && <Loader2Icon className="animate-spin mr-2" size={16} />}
              {domainsSaving ? 'Guardando...' : 'Guardar Dominios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300/80 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangleIcon className="size-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription className="text-foreground/80">
            Acciones irreversibles de mantenimiento de base de datos. Usar con extrema precaución al inicio de un nuevo ciclo escolar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-red-200 bg-white/80 p-4 sm:flex-row sm:items-center dark:border-red-900/80 dark:bg-background/70">
            <div className="space-y-1 mb-4 sm:mb-0">
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Purgar Padrón de Alumnos</h4>
              <p className="max-w-md text-xs leading-relaxed text-foreground/80">
                Elimina las cuentas de alumnos y todo su historial de calificaciones, participaciones y perfiles. Los exámenes y reactivos se conservarán.
              </p>
            </div>
            <Button variant="destructive" className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700 sm:w-auto" onClick={() => setPurgeAlertOpen(true)} disabled={purging}>
              {purging ? <Loader2Icon className="animate-spin mr-2 size-4" /> : <Trash2 className="mr-2 size-4" />}
              {purging ? 'Purgando...' : 'Purgar alumnos'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      <AlertDialog open={purgeAlertOpen} onOpenChange={setPurgeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangleIcon className="size-5" />
              ¡ADVERTENCIA!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de ELIMINAR a todos los alumnos y sus resultados de la base de datos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-2">
            <p className="text-sm">
              Escribe <strong>PURGAR</strong> para confirmar la eliminación:
            </p>
            <Input 
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder="PURGAR"
              className="font-mono text-center tracking-widest uppercase"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeConfirmText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handlePurge();
              }} 
              disabled={purgeConfirmText !== 'PURGAR'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
