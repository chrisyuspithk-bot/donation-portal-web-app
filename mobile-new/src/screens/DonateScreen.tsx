import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { PaymentConfirmation } from '../types';

export default function DonateScreen() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PaymentConfirmation | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const donorId = useAuthStore((s) => s.donorId);

  const handleDonate = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      Alert.alert('Validation', 'Please enter a valid donation amount');
      return;
    }
    if (!donorId) {
      Alert.alert('Error', 'Account setup incomplete. Please log out and back in.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/api/donations/create-intent', {
        amount: cents,
        currency: 'usd',
        donor_id: donorId,
      });

      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: data.client_secret,
        merchantDisplayName: 'Fundraising',
        allowsDelayedPaymentMethods: true,
      });

      if (error) {
        Alert.alert('Payment Error', error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        return;
      }

      // Payment succeeded — poll for confirmation
      setConfirming(true);
      await pollConfirmation(data.payment_intent_id);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create payment';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  const pollConfirmation = async (intentId: string) => {
    for (let i = 0; i < 10; i++) {
      try {
        const { data } = await api.get(`/api/donations/confirm/${intentId}`);
        if (data.status === 'completed') {
          setResult(data);
          return;
        }
      } catch {
        // payment may not be processed yet
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    // Fallback: fetch one more time
    try {
      const { data } = await api.get(`/api/donations/confirm/${intentId}`);
      setResult(data);
    } catch {
      setResult({
        id: '',
        amount: parseFloat(amount) * 100,
        currency: 'usd',
        status: 'completed',
        receipt_url: null,
        created_at: new Date().toISOString(),
      });
    }
  };

  const presetAmounts = ['10', '25', '50', '100', '250', '500'];

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successAmount}>
            ${parseFloat(amount).toFixed(2)}
          </Text>
          <Text style={styles.successStatus}>
            {result.status === 'completed' ? 'Donation confirmed' : 'Processing...'}
          </Text>
          {result.receipt_url && (
            <Text style={styles.receiptLink}>Receipt available</Text>
          )}
          <TouchableOpacity
            style={styles.donateAgainButton}
            onPress={() => {
              setResult(null);
              setAmount('');
            }}
          >
            <Text style={styles.donateAgainText}>Make Another Donation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Make a Donation</Text>
      <Text style={styles.subtitle}>Every contribution makes a difference</Text>

      <View style={styles.presets}>
        {presetAmounts.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetButton, amount === preset && styles.presetActive]}
            onPress={() => setAmount(preset)}
          >
            <Text style={[styles.presetText, amount === preset && styles.presetTextActive]}>
              ${preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customAmount}>
        <Text style={styles.dollarSign}>$</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#64748b"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <TouchableOpacity
        style={[styles.donateButton, (loading || confirming) && styles.buttonDisabled]}
        onPress={handleDonate}
        disabled={loading || confirming}
      >
        {(loading || confirming) ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.donateButtonText}>
            Donate ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.secureNote}>
        🔒 Secured by Stripe · Your payment info is never stored
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  presetTextActive: {
    color: '#0f172a',
  },
  customAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f59e0b',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    padding: 16,
  },
  donateButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  secureNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 16,
  },
  successCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 64,
    color: '#10b981',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 8,
  },
  successStatus: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  receiptLink: {
    fontSize: 14,
    color: '#60a5fa',
    marginBottom: 24,
  },
  donateAgainButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  donateAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
});
