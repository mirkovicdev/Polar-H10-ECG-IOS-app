import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import ECGScreen from './src/screens/ECGScreen';
import BurdenScreen from './src/screens/BurdenScreen';

// Import context providers
import { BluetoothProvider } from './src/context/BluetoothContext';
import { ECGProvider } from './src/context/ECGContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#111827" translucent={false} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // Hide the header completely
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'ECG') {
              iconName = focused ? 'pulse' : 'pulse-outline';
            } else if (route.name === 'Burden') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#10b981', // green-500
          tabBarInactiveTintColor: '#6b7280', // gray-500
          tabBarStyle: {
            backgroundColor: '#111827', // gray-900
            borderTopColor: '#374151', // gray-700
            borderTopWidth: 1,
            paddingBottom: insets.bottom + 4, // Adjust for safe area
            paddingTop: 8,
            height: 60 + insets.bottom, // Dynamic height based on safe area
            position: 'absolute', // Float above content
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 4,
          },
        })}
      >
        <Tab.Screen 
          name="ECG" 
          component={ECGScreen}
          options={{
            title: '🫀 ECG Monitor'
          }}
        />
        <Tab.Screen 
          name="Burden" 
          component={BurdenScreen}
          options={{
            title: '📊 Burden Analysis'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <SafeAreaProvider>
        <BluetoothProvider>
          <ECGProvider>
            <AppNavigator />
          </ECGProvider>
        </BluetoothProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Full black background
  },
});