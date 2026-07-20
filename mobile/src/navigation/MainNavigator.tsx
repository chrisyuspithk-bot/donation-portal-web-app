import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DonateScreen } from '../screens/DonateScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Donate"
        component={DonateScreen}
        options={{ tabBarIcon: () => <Text>💝</Text>, headerTitle: 'Make a Donation' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: () => <Text>📋</Text>, headerTitle: 'Donation History' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarIcon: () => <Text>💬</Text>, headerTitle: 'Support Chat' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: () => <Text>👤</Text>, headerTitle: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
