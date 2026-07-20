// Stripe is mobile-only. On web, return no-ops so the app doesn't crash.

export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: undefined as any }),
    presentPaymentSheet: async () => ({ error: undefined as any }),
    isStripeAvailable: false,
  };
}
