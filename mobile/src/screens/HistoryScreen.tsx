import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { donationsApi, receiptsApi } from '../services/api';

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  receipt_url?: string;
}

export function HistoryScreen() {
  const donorId = useAuthStore((s) => s.donorId);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!donorId) return;
    donationsApi.history(donorId).then(({ data }) => {
      setDonations(data.donations);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [donorId]);

  const fmt = (cents: number, curr: string) =>
    `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${curr.toUpperCase()}`;

  const renderItem = ({ item }: { item: Donation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>{fmt(item.amount, item.currency)}</Text>
        <View style={[styles.badge, statusColors[item.status] || {}]}>
          <Text style={[styles.badgeText, statusTextColors[item.status] || {}]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      {item.receipt_url && (
        <TouchableOpacity onPress={() => Linking.openURL(receiptsApi.downloadUrl(item.id))}>
          <Text style={styles.receiptLink}>📄 View Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No donations yet. Make your first impact!</Text>}
        />
      )}
    </View>
  );
}

const statusColors: Record<string, object> = {
  completed: { backgroundColor: '#dcfce7' },
  pending: { backgroundColor: '#fef9c3' },
  failed: { backgroundColor: '#fecaca' },
  refunded: { backgroundColor: '#f3f4f6' },
};

const statusTextColors: Record<string, object> = {
  completed: { color: '#166534' },
  pending: { color: '#854d0e' },
  failed: { color: '#991b1b' },
  refunded: { color: '#6b7280' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 14, color: '#6b7280' },
  receiptLink: { marginTop: 8, color: '#2563eb', fontSize: 14, fontWeight: '500' },
  loading: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 16 },
});
