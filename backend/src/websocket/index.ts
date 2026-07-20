import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { AuthPayload } from '../middleware/auth';

let io: Server;

export function initializeSocketIO(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: config.cors.origin, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = jwt.verify(token as string, config.jwt.secret) as AuthPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    logger.info(`Socket connected: ${user.userId}`);

    // Join personal room for targeted events
    socket.join(`user:${user.userId}`);

    // Auto-join donor's own chat room (so mobile donor receives admin replies immediately)
    try {
      const donorResult = await query('SELECT id FROM donors WHERE user_id = $1', [user.userId]);
      if (donorResult.rows.length > 0) {
        const donorId = donorResult.rows[0].id;
        socket.join(`chat:${donorId}`);
        logger.info(`Auto-joined donor ${donorId} to chat:${donorId}`);
      }
    } catch (err) {
      logger.error('Failed to auto-join donor chat room:', err);
    }

    // Admin users: join dashboard room + all donor chat rooms
    if (user.email?.endsWith('@admin.fundraising.local')) {
      socket.join('admin:dashboard');
      try {
        const donors = await query('SELECT id FROM donors');
        for (const donor of donors.rows) {
          socket.join(`chat:${donor.id}`);
        }
        logger.info(`Admin ${user.userId} joined ${donors.rows.length} donor chat rooms`);
      } catch (err) {
        logger.error('Failed to join donor chat rooms for admin:', err);
      }
    }

    socket.on('chat:join_room', (donorId: string) => {
      socket.join(`chat:${donorId}`);
      logger.info(`User ${user.userId} joined chat room: chat:${donorId}`);
    });

    socket.on('chat:send_message', async (data: { receiver_id: string; message: string }) => {
      try {
        const { receiver_id, message } = data;
        const senderId = user.userId;

        await query(
          `INSERT INTO chat_messages (id, sender_id, receiver_id, message, is_read, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())`,
          [senderId, receiver_id, message]
        );

        const payload = {
          sender_id: senderId,
          receiver_id,
          message,
          created_at: new Date().toISOString(),
        };

        io.to(`chat:${receiver_id}`).emit('chat:send_message', payload);
        io.to(`chat:${senderId}`).emit('chat:send_message', payload);
      } catch (err) {
        logger.error('Chat message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', (data: { receiver_id: string; is_typing: boolean }) => {
      io.to(`chat:${data.receiver_id}`).emit('chat:typing', {
        sender_id: user.userId,
        receiver_id: data.receiver_id,
        is_typing: data.is_typing,
      });
    });

    socket.on('chat:mark_read', async (data: { sender_id: string }) => {
      try {
        await query(
          'UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
          [data.sender_id, user.userId]
        );
      } catch (err) {
        logger.error('Mark read error:', err);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
