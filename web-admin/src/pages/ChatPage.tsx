import { useEffect, useState, useRef } from 'react';
import { chatApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../stores/authStore';

interface ChatSession {
  donor_id: string;
  user_id: string;
  donor_name: string;
  email: string;
  unread_count: number;
}

interface Message {
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export function ChatPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeDonor, setActiveDonor] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeDonorRef = useRef(activeDonor);
  activeDonorRef.current = activeDonor;

  useEffect(() => {
    chatApi.getSessions().then(({ data }) => setSessions(data.sessions)).catch(console.error);

    const socket = getSocket();
    const handleMessage = (msg: Message) => {
      const donorId = activeDonorRef.current;
      // Only add message if it belongs to the currently active donor chat
      if (donorId && msg.receiver_id === donorId) {
        setMessages((prev) => {
          // Deduplicate: skip if the last message already matches (same sender, text, timestamp)
          const last = prev[prev.length - 1];
          if (last &&
              last.sender_id === msg.sender_id &&
              last.message === msg.message &&
              last.created_at === msg.created_at) {
            return prev;
          }
          return [...prev, msg];
        });
      }
      chatApi.getSessions().then(({ data }) => setSessions(data.sessions)).catch(console.error);
    };

    socket.on('chat:send_message', handleMessage);

    return () => { socket.off('chat:send_message', handleMessage); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const joinDonorChat = (donorId: string) => {
    setActiveDonor(donorId);
    const socket = getSocket();
    socket.emit('chat:join_room', donorId);

    chatApi.getMessages(donorId).then(({ data }) => setMessages(data.messages)).catch(() => setMessages([]));

    const donor = sessions.find((s) => s.donor_id === donorId);
    if (donor) {
      socket.emit('chat:mark_read', { sender_id: donorId });
      setSessions((prev) => prev.map((s) => s.donor_id === donorId ? { ...s, unread_count: 0 } : s));
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !activeDonor) return;
    const socket = getSocket();
    socket.emit('chat:send_message', { receiver_id: activeDonor, message: input.trim() });
    setInput('');
  };

  const activeSession = sessions.find((s) => s.donor_id === activeDonor);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Sessions sidebar */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <h2 className="font-semibold">Active Chats</h2>
        </div>
        <div className="flex-1 overflow-auto">
          {sessions.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">No active chat sessions</p>
          ) : sessions.map((session) => (
            <button
              key={session.donor_id}
              onClick={() => joinDonorChat(session.donor_id)}
              className={`w-full text-left p-4 border-b hover:bg-gray-100 transition-colors ${
                activeDonor === session.donor_id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{session.donor_name}</span>
                {session.unread_count > 0 && (
                  <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">{session.unread_count}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{session.email}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold">{activeSession.donor_name}</h3>
              <p className="text-xs text-gray-400">{activeSession.email}</p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((msg, i) => {
                const isAdmin = msg.sender_id === adminId;
                return (
                  <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                      isAdmin ? 'bg-brand-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? 'text-brand-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-full text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              />
              <button onClick={sendMessage}
                className="px-5 py-2 bg-brand-600 text-white rounded-full text-sm font-medium hover:bg-brand-700 transition-colors">
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a chat session to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
