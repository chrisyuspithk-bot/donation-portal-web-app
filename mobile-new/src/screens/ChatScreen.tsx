import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import {
  connectSocket,
  joinChatRoom,
  sendChatMessage,
  sendTyping,
  markMessagesRead,
} from '../services/socket';
import type { ChatMessage } from '../types';

const ADMIN_ID = 'admin';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages[ADMIN_ID] || []);
  const isAdminTyping = useChatStore((s) => s.typingUsers[ADMIN_ID] || false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roomId = user?.id || '';

  useEffect(() => {
    if (!user) return;
    try {
      const s = connectSocket();
      s.on('connect', () => {
        setConnected(true);
        joinChatRoom(roomId);
        markMessagesRead(ADMIN_ID);
      });
      s.on('disconnect', () => setConnected(false));
      return () => {
        s.off('connect');
        s.off('disconnect');
      };
    } catch {
      // socket already connected or auth missing
    }
  }, [user, roomId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !user) return;
    sendChatMessage(ADMIN_ID, text);
    setInput('');
    sendTyping(ADMIN_ID, false);
  }, [input, user]);

  const handleTyping = (text: string) => {
    setInput(text);
    sendTyping(ADMIN_ID, text.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(ADMIN_ID, false), 2000);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleThem]}>
          <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextThem]}>
            {item.message}
          </Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Chat</Text>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#10b981' : '#ef4444' }]} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSubtext}>Send a message to get help</Text>
          </View>
        }
      />

      {isAdminTyping && (
        <Text style={styles.typing}>Admin is typing...</Text>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={handleTyping}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  msgList: {
    padding: 16,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleMine: {
    backgroundColor: '#f59e0b',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  msgText: {
    fontSize: 15,
  },
  msgTextMine: {
    color: '#0f172a',
  },
  msgTextThem: {
    color: '#f1f5f9',
  },
  msgTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'right',
  },
  msgTimeMine: {
    color: '#0f172a80',
  },
  typing: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#f1f5f9',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyChatIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
