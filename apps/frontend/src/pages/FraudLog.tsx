import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Loader2Icon, ShieldAlertIcon, ArrowLeftIcon, AlertTriangleIcon, CopyIcon, ClipboardPasteIcon, EyeOffIcon, MousePointerClickIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FraudEvent {
  id: string;
  userId: string;
  action: string;
  metadata: any;
  timestamp: string;
  user: { email: string, profile: { firstName: string, lastName: string } | null } | null;
}

const ACTION_LABELS: Record<string, { label: string, icon: React.ReactNode, color: string }> = {
  'TAB_SWITCH': { label: 'Cambio de Pestaña', icon: <EyeOffIcon className="size-4" />, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  'WINDOW_BLUR': { label: 'Pérdida de Foco', icon: <MousePointerClickIcon className="size-4" />, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  'PASTE_ATTEMPT': { label: 'Intento de Pegado', icon: <ClipboardPasteIcon className="size-4" />, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  'COPY_ATTEMPT': { label: 'Intento de Copiado', icon: <CopyIcon className="size-4" />, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
}

export function FraudLog({ examId, onBack }: { examId: string, onBack: () => void }) {
  const token = localStorage.getItem('sicba_token');
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [logs, setLogs] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${API}/api/exams/${examId}/audit-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err: any) {
        console.error('Error fetching logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [examId, token]);

  // Conexión Socket.io
  useEffect(() => {
    if (!token) return;
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_exam_room', examId);
    });

    newSocket.on('fraud_alert', (data: any) => {
      setLogs(prev => [data, ...prev]);
    });

    return () => {
      newSocket.emit('leave_exam_room', examId);
      newSocket.disconnect();
    };
  }, [examId, token]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground font-sans border-l border-border rounded-r-xl">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
        <ShieldAlertIcon className="size-5 text-destructive" />
        <h2 className="font-semibold text-lg">Registro Antifraude</h2>
        <Badge variant="destructive" className="ml-auto rounded-full px-2">
          {logs.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShieldAlertIcon className="size-10 mx-auto mb-3 opacity-20" />
            <p>No se han detectado incidencias.</p>
          </div>
        ) : (
          logs.map(log => {
            const actionDef = ACTION_LABELS[log.action] || { label: log.action, icon: <AlertTriangleIcon className="size-4" />, color: 'text-slate-400 bg-slate-800' };
            const name = log.user?.profile ? `${log.user.profile.firstName} ${log.user.profile.lastName}` : (log.user?.email || 'Alumno Desconocido');
            const time = new Date(log.timestamp).toLocaleTimeString();

            return (
              <Card key={log.id} className="bg-background/80 border-border p-3 shadow-none overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1 h-full ${actionDef.color.split(' ')[0].replace('text-', 'bg-')}`} />
                <div className="flex flex-col gap-2 pl-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground truncate pr-2">{name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`font-normal border ${actionDef.color} gap-1 px-1.5 py-0.5 text-xs`}>
                      {actionDef.icon}
                      {actionDef.label}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
