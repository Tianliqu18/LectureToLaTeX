import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FilesScreen from '../screens/FilesScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';

const Stack = createNativeStackNavigator();

export default function FilesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FilesList" component={FilesScreen} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    </Stack.Navigator>
  );
}
