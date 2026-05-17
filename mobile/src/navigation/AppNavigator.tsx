import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAppState } from '../state/AppStateContext';
import { theme } from '../constants/theme';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { state } = useAppState();
  const pendingCount = state.transactions.filter((t) => !t.reviewed && t.aiCategory).length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bgCard, shadowColor: 'transparent' },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: theme.colors.bgCard,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 82,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          title: 'Overview',
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
          title: 'Transactions',
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="sparkles" size={size} color={color} />
              {pendingCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
          ),
          title: 'Review',
          tabBarLabel: 'Review',
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
          title: 'Budgets',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
