import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from './src/stores/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
