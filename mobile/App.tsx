import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppStateProvider, useAppState } from './src/state/AppStateContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/constants/theme';

function Root() {
  const { loading } = useAppState();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: theme.colors.accent,
              background: theme.colors.bg,
              card: theme.colors.bgCard,
              text: theme.colors.textPrimary,
              border: theme.colors.border,
              notification: theme.colors.accent,
            },
          }}
        >
          <StatusBar style="light" />
          <Root />
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
