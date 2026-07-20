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
        options={{ tabBarIcon: () => <Text>💝</Text>, headerTitle: 'Make a Donation' }}
      >
        {(props) => <DonateScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen
        name="History"
        options={{ tabBarIcon: () => <Text>📋</Text>, headerTitle: 'Donation History' }}
      >
        {(props) => <HistoryScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen
        name="Chat"
        options={{ tabBarIcon: () => <Text>💬</Text>, headerTitle: 'Support Chat' }}
      >
        {(props) => <ChatScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{ tabBarIcon: () => <Text>👤</Text>, headerTitle: 'Profile' }}
      >
        {(props) => <ProfileScreen {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
