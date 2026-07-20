// Stripe is mobile-only. On web, return no-ops so the app doesn't crash.
import { createContext, useContext, FC, ReactNode } from 'react';

const StripeContext = createContext<{ isStripeAvailable: boolean }>({ isStripeAvailable: false });

export const StripeProvider: FC<{ children: ReactNode; publishableKey: string }> = ({ children }) => (
  <StripeContext.Provider value={{ isStripeAvailable: true }}>
    {children}
  </StripeContext.Provider>
);

export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: undefined as any }),
    presentPaymentSheet: async () => ({ error: undefined as any }),
    isStripeAvailable: false,
  };
}
