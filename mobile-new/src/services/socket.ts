import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket?.id);
  });

  socket.on('chat:send_message', (msg) => {
    useChatStore.getState().addMessage('admin', msg);
  });

  socket.on('chat:typing', (data: { sender_id: string; is_typing: boolean }) => {
    useChatStore.getState().setTyping('admin', data.is_typing);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinChatRoom(donorId: string): void {
  socket?.emit('chat:join_room', donorId);
}

export function sendChatMessage(receiverId: string, message: string): void {
  socket?.emit('chat:send_message', { receiver_id: receiverId, message });
}

export function sendTyping(receiverId: string, isTyping: boolean): void {
  socket?.emit('chat:typing', { receiver_id: receiverId, is_typing: isTyping });
}

export function markMessagesRead(senderId: string): void {
  socket?.emit('chat:mark_read', { sender_id: senderId });
}
