import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Donation } from '../types';

export default function HistoryScreen() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const donorId = useAuthStore((s) => s.donorId);
  const fetchDonorId = useAuthStore((s) => s.fetchDonorId);

  useEffect(() => {
    if (!donorId) {
      fetchDonorId().finally(() => setLoading(false));
    }
  }, []);

  const fetchHistory = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!donorId) return;
    try {
      const { data } = await api.get(
        `/api/donations/history/${donorId}?page=${pageNum}&page_size=20`
      );
      if (isRefresh || pageNum === 1) {
        setDonations(data.donations);
      } else {
        setDonations((prev) => [...prev, ...data.donations]);
      }
      setTotal(data.total);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [donorId]);

  useEffect(() => {
    if (donorId) {
      setLoading(true);
      fetchHistory(1);
    }
  }, [donorId, fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory(1, true);
  };

  const handleLoadMore = () => {
    if (donations.length < total && !loading) {
      fetchHistory(page + 1);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'refunded': return '#6b7280';
      default: return '#94a3b8';
    }
  };

  const renderItem = ({ item }: { item: Donation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>
          {(item.amount / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: item.currency.toUpperCase(),
          })}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      {item.receipt_url && (
        <TouchableOpacity style={styles.receiptLink}>
          <Text style={styles.receiptText}>📄 View Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Donation History</Text>
      {donations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💝</Text>
          <Text style={styles.emptyText}>No donations yet</Text>
          <Text style={styles.emptySubtext}>Your giving journey starts here</Text>
        </View>
      ) : (
        <FlatList
          data={donations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f59e0b" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            donations.length < total ? (
              <ActivityIndicator style={{ padding: 20 }} color="#f59e0b" />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  receiptLink: {
    alignSelf: 'flex-start',
  },
  receiptText: {
    fontSize: 14,
    color: '#60a5fa',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
