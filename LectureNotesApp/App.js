import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FilesStack from './navigation/FilesStack';
import CameraScreen from './screens/CameraScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import { COLORS } from './constants/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Files') {
              return <Ionicons name={focused ? 'folder' : 'folder-outline'} size={size} color={color} />;
            } else if (route.name === 'Camera') {
              return <Ionicons name="add-outline" size={36} color={color} />;
            } else if (route.name === 'Chat') {
              return <Ionicons name={focused ? 'calculator' : 'calculator-outline'} size={size} color={color} />;
            }
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
        })}
      >
        <Tab.Screen name="Files" component={FilesStack} />
        <Tab.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            tabBarLabel: () => null,
          }}
        />
        <Tab.Screen name="Chat" component={ChatbotScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
