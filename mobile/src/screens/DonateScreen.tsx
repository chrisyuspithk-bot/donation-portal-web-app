import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuthStore } from '../stores/authStore';
import { donationsApi } from '../services/api';
import { getSocket } from '../services/socket';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000]; // in cents

export function DonateScreen() {
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const donorId = useAuthStore((s) => s.donorId);

  const selectedAmount = customAmount || amount;

  const handleDonate = async () => {
    const amountCents = parseInt(selectedAmount, 10);
    if (!amountCents || amountCents < 50 || !donorId) {
      Alert.alert('Invalid amount', 'Please select or enter an amount of at least $0.50');
      return;
    }

    setLoading(true);
    try {
      const { data } = await donationsApi.createIntent(amountCents, donorId);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.client_secret,
        merchantDisplayName: 'Fundraising Platform',
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        setLoading(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        setLoading(false);
        return;
      }

      // Payment succeeded - poll for confirmation
      pollForConfirmation(data.payment_intent_id);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  };

  const pollForConfirmation = async (intentId: string, attempts = 0) => {
    if (attempts > 10) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await donationsApi.confirmPayment(intentId);
      if (data.status === 'completed') {
        setLoading(false);
        Alert.alert(
          'Thank You! 🎉',
          `Your donation of $${(data.amount / 100).toFixed(2)} has been received.${data.receipt_url ? ' Your receipt is ready!' : ''}`,
          [{ text: 'OK' }]
        );
        setAmount('');
        setCustomAmount('');
        return;
      }
    } catch {
      // Still processing
    }

    setTimeout(() => pollForConfirmation(intentId, attempts + 1), 1000);
  };

  // Listen for receipt-ready events via socket
  useEffect(() => {
    const socket = getSocket();
    socket.on('notification:receipt_ready', (event: any) => {
      Alert.alert('Receipt Ready', `Your receipt for donation ${event.donation_id} is ready to view.`);
    });
    return () => { socket.off('notification:receipt_ready'); };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Choose Your Impact</Text>
      <Text style={styles.subheading}>Every donation makes a difference</Text>

      <View style={styles.presets}>
        {PRESET_AMOUNTS.map((amt) => {
          const display = `$${(amt / 100).toFixed(0)}`;
          return (
            <TouchableOpacity
              key={amt}
              style={[styles.presetBtn, selectedAmount === String(amt) && styles.presetActive]}
              onPress={() => { setAmount(String(amt)); setCustomAmount(''); }}
            >
              <Text style={[styles.presetText, selectedAmount === String(amt) && styles.presetTextActive]}>
                {display}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.orText}>or enter a custom amount</Text>

      <View style={styles.customRow}>
        <Text style={styles.dollarSign}>$</Text>
        <TextInput
          style={styles.customInput}
          value={customAmount ? (parseInt(customAmount, 10) / 100).toFixed(0) : ''}
          onChangeText={(t) => {
            const cents = parseInt(t, 10) * 100;
            setCustomAmount(t ? String(cents) : '');
            setAmount('');
          }}
          placeholder="0"
          keyboardType="number-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.donateBtn, (!selectedAmount || loading) && styles.donateBtnDisabled]}
        onPress={handleDonate}
        disabled={!selectedAmount || loading}
      >
        <Text style={styles.donateBtnText}>
          {loading ? 'Processing...' : `Donate $${selectedAmount ? (parseInt(selectedAmount, 10) / 100).toFixed(2) : '0.00'}`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.secureText}>🔒 Secured by Stripe</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 32 },
  heading: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
  subheading: { fontSize: 16, textAlign: 'center', color: '#6b7280', marginBottom: 32, marginTop: 4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  presetBtn: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, minWidth: 80, alignItems: 'center' },
  presetActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  presetText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  presetTextActive: { color: '#2563eb' },
  orText: { textAlign: 'center', color: '#9ca3af', marginVertical: 20 },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  dollarSign: { fontSize: 28, fontWeight: 'bold', color: '#374151', marginRight: 4 },
  customInput: { fontSize: 28, fontWeight: 'bold', borderBottomWidth: 2, borderBottomColor: '#2563eb', minWidth: 80, textAlign: 'center', paddingVertical: 4, color: '#111827' },
  donateBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  donateBtnDisabled: { opacity: 0.5 },
  donateBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secureText: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },
});
