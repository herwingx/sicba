import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // En producción debería restringirse
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Unirse a una sala específica de un examen (para admins/proyectores)
    socket.on('join_exam_room', (examId: string) => {
      socket.join(`exam_${examId}`);
      console.log(`👀 Cliente ${socket.id} se unió a la sala del examen: ${examId}`);
    });

    socket.on('leave_exam_room', (examId: string) => {
      socket.leave(`exam_${examId}`);
      console.log(`👋 Cliente ${socket.id} abandonó la sala del examen: ${examId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado!');
  }
  return io;
};
