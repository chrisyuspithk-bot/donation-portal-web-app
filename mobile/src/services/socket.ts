import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = 'https://api.fundraising.app';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket?.connected) {
    const token = useAuthStore.getState().token;
    socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
