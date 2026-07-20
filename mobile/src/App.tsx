import '@expo/metro-runtime';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from './stores/authStore';
import { AuthNavigator } from './navigation/AuthNavigator';
import { MainNavigator } from './navigation/MainNavigator';

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
