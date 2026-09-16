import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/lib/language-context';
import { AuthProvider } from './src/lib/auth-context';
import { UpdateProvider } from './src/lib/update-manager';
import { UpdateModal } from './src/components/UpdateModal';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LanguageProvider>
        <AuthProvider>
          <UpdateProvider>
            <StatusBar style="dark" />
            <AppNavigator />
            <UpdateModal />
          </UpdateProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

