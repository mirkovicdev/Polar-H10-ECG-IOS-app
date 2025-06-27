import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useBluetooth } from '../context/BluetoothContext';

export default function BluetoothConnectionCard() {
  const { state, startScan, connectToDevice, disconnect, clearError } = useBluetooth();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScan = async () => {
    try {
      clearError();
      await startScan();
      setIsExpanded(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Failed', 'Could not scan for devices. Please check Bluetooth permissions.');
    }
  };

  const handleConnect = async (device: Device) => {
    try {
      await connectToDevice(device);
      setIsExpanded(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}. Please try again.`);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Device',
      `Disconnect from ${state.currentDevice?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const getConnectionStatusColor = () => {
    if (state.status.isConnected) return '#10b981'; // green-500
    if (state.isScanning) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  const getConnectionStatusIcon = () => {
    if (state.status.isConnected) return 'checkmark-circle';
    if (state.isScanning) return 'radio';
    return 'bluetooth';
  };

  const getConnectionStatusText = () => {
    if (state.status.isConnected) {
      return `Connected to ${state.currentDevice?.name}`;
    }
    if (state.isScanning) return 'Scanning for devices...';
    if (state.availableDevices.length > 0) return `Found ${state.availableDevices.length} device(s)`;
    return 'Ready to scan';
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleConnect(item)}
      disabled={state.isScanning}
    >
      <View style={styles.deviceInfo}>
        <Ionicons name="heart" size={20} color="#ef4444" />
        <View style={styles.deviceText}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceId}>{item.id}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Main Connection Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIcon}>
            <Ionicons 
              name={getConnectionStatusIcon()} 
              size={24} 
              color={getConnectionStatusColor()} 
            />
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Polar H10 Connection</Text>
            <Text style={[styles.statusText, { color: getConnectionStatusColor() }]}>
              {getConnectionStatusText()}
            </Text>
            
            {/* Battery and Signal Quality */}
            {state.status.isConnected && (
              <View style={styles.statusDetails}>
                {state.status.batteryLevel && (
                  <View style={styles.statusDetail}>
                    <Ionicons name="battery-half" size={14} color="#10b981" />
                    <Text style={styles.statusDetailText}>{state.status.batteryLevel}%</Text>
                  </View>
                )}
                <View style={styles.statusDetail}>
                  <Ionicons name="radio" size={14} color="#10b981" />
                  <Text style={styles.statusDetailText}>
                    {(state.status.signalQuality * 100).toFixed(0)}%
                  </Text>
                </View>
                {state.status.isStreaming && (
                  <View style={styles.statusDetail}>
                    <View style={styles.streamingDot} />
                    <Text style={styles.statusDetailText}>Streaming</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              state.status.isConnected && styles.actionButtonDisconnect
            ]}
            onPress={state.status.isConnected ? handleDisconnect : handleScan}
            disabled={state.isScanning}
          >
            {state.isScanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons 
                name={state.status.isConnected ? "close" : "search"} 
                size={20} 
                color="#ffffff" 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {state.error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{state.error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Ionicons name="close" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Device List (when scanning/found devices) */}
      {(state.availableDevices.length > 0 || isExpanded) && !state.status.isConnected && (
        <View style={styles.deviceList}>
          <View style={styles.deviceListHeader}>
            <Text style={styles.deviceListTitle}>Available Devices</Text>
            <TouchableOpacity 
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.collapseButton}
            >
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
          
          {isExpanded && (
            <>
              {state.availableDevices.length > 0 ? (
                <FlatList
                  data={state.availableDevices}
                  renderItem={renderDeviceItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : state.isScanning ? (
                <View style={styles.scanningContainer}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.scanningText}>Scanning for Polar devices...</Text>
                  <Text style={styles.scanningSubtext}>Make sure your Polar H10 is on and nearby</Text>
                </View>
              ) : (
                <View style={styles.noDevicesContainer}>
                  <Ionicons name="search" size={48} color="#6b7280" />
                  <Text style={styles.noDevicesText}>No devices found</Text>
                  <Text style={styles.noDevicesSubtext}>
                    Make sure your Polar H10 is turned on and in pairing mode
                  </Text>
                  <TouchableOpacity style={styles.rescanButton} onPress={handleScan}>
                    <Text style={styles.rescanButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statusDetailText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisconnect: {
    backgroundColor: '#ef4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#fecaca',
    marginLeft: 8,
  },
  deviceList: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  deviceListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  deviceListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  collapseButton: {
    padding: 4,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceText: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
  },
  scanningContainer: {
    padding: 32,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  scanningSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  noDevicesContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  rescanButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  rescanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});