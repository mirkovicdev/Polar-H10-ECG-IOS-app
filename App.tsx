import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import ECGScreen from './src/screens/ECGScreen';
import BurdenScreen from './src/screens/BurdenScreen';

// Import context providers
import { BluetoothProvider } from './src/context/BluetoothContext';
import { ECGProvider } from './src/context/ECGContext';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <BluetoothProvider>
        <ECGProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor="#000000" />
            <View style={styles.container}>
              <Tab.Navigator
                screenOptions={({ route }) => ({
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
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 88,
                  },
                  tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                  },
                  headerStyle: {
                    backgroundColor: '#111827', // gray-900
                    borderBottomColor: '#374151', // gray-700
                    borderBottomWidth: 1,
                  },
                  headerTitleStyle: {
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: '600',
                  },
                  headerTitleAlign: 'center',
                })}
              >
                <Tab.Screen 
                  name="ECG" 
                  component={ECGScreen}
                  options={{
                    title: '🫀 ECG Monitor',
                    headerTitle: 'ECG Monitor'
                  }}
                />
                <Tab.Screen 
                  name="Burden" 
                  component={BurdenScreen}
                  options={{
                    title: '📊 Burden Analysis',
                    headerTitle: 'Burden Analysis'
                  }}
                />
              </Tab.Navigator>
            </View>
          </NavigationContainer>
        </ECGProvider>
      </BluetoothProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});