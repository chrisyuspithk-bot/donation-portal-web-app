import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { getSocket } from '../services/socket';

interface Message {
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export function ChatScreen() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const socket = getSocket();
    const donorId = useAuthStore.getState().donorId;
    if (donorId) socket.emit('chat:join_room', donorId);

    socket.on('chat:send_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTyping(false);
    });

    socket.on('chat:typing', (data: { is_typing: boolean }) => {
      setTyping(data.is_typing);
    });

    return () => {
      socket.off('chat:send_message');
      socket.off('chat:typing');
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const socket = getSocket();
    socket.emit('chat:send_message', { receiver_id: 'admin', message: input.trim() });
    setInput('');
  };

  const handleTyping = (text: string) => {
    setInput(text);
    const socket = getSocket();
    socket.emit('chat:typing', { receiver_id: 'admin', is_typing: text.length > 0 });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRight : styles.msgLeft]}>
        <View style={[styles.msgBubble, isMine ? styles.msgMine : styles.msgTheirs]}>
          <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>Send a message to get help from our support team.</Text>}
      />
      {typing && <Text style={styles.typing}>Admin is typing...</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={handleTyping}
          placeholder="Type your message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!input.trim()}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  msgRow: { marginBottom: 12 },
  msgLeft: { alignItems: 'flex-start' },
  msgRight: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  msgMine: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  msgTheirs: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  msgTextTheirs: { color: '#111827' },
  msgTime: { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: '#bfdbfe' },
  typing: { paddingHorizontal: 16, paddingBottom: 4, color: '#9ca3af', fontSize: 12, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
