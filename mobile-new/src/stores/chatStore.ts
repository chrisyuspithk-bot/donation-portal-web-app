import { create } from 'zustand';
import type { ChatMessage } from '../types';

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, boolean>;

  addMessage: (roomId: string, msg: ChatMessage) => void;
  setMessages: (roomId: string, msgs: ChatMessage[]) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingUsers: {},

  addMessage: (roomId, msg) => {
    const existing = get().messages[roomId] || [];
    // Deduplicate: skip if the last message already matches
    const last = existing[existing.length - 1];
    if (last &&
        last.sender_id === msg.sender_id &&
        last.message === msg.message &&
        last.created_at === msg.created_at) {
      return;
    }
    set({
      messages: { ...get().messages, [roomId]: [...existing, msg] },
    });
  },

  setMessages: (roomId, msgs) => {
    set({ messages: { ...get().messages, [roomId]: msgs } });
  },

  setTyping: (roomId, isTyping) => {
    set({ typingUsers: { ...get().typingUsers, [roomId]: isTyping } });
  },

  clear: () => set({ messages: {}, typingUsers: {} }),
}));
