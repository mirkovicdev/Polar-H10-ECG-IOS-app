import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { 
  PanGestureHandler,
  GestureHandlerRootView,
  GestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent 
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Context hooks
import { useBluetooth } from '../context/BluetoothContext';
import { useECG } from '../context/ECGContext';

// Components
import BluetoothConnectionCard from '../components/BluetoothConnectionCard';
import ECGChart from '../components/ECGChart';
import TrainingOverlay from '../components/TrainingOverlay';
import StatisticsCard from '../components/StatisticsCard';
import TimelineControls from '../components/TimelineControls';

const { width: screenWidth } = Dimensions.get('window');

export default function ECGScreen() {
  const { state: bluetoothState } = useBluetooth();
  const { state: ecgState, goToLiveMode, navigateTimeline, setTimeWindow } = useECG();
  
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(10);

  // Handle swipe gestures for timeline navigation
  const handleSwipeGesture = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    // Only process significant swipes
    if (Math.abs(translationX) < 20) return;
    
    // Calculate navigation delta based on swipe distance and velocity
    const pixelsPerSecond = screenWidth / selectedTimeWindow;
    const deltaSeconds = -translationX / pixelsPerSecond; // Negative for natural scroll direction
    
    // Add velocity boost for fast swipes
    const velocityBoost = Math.sign(deltaSeconds) * Math.min(5, Math.abs(velocityX) / 1000);
    const finalDelta = deltaSeconds + velocityBoost;
    
    // Haptic feedback for swipes
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    navigateTimeline(finalDelta);
  }, [selectedTimeWindow, navigateTimeline]);

  const handleTimeWindowChange = useCallback((seconds: number) => {
    setSelectedTimeWindow(seconds);
    setTimeWindow(seconds);
    Haptics.selectionAsync();
  }, [setTimeWindow]);

  const handleGoLive = useCallback(() => {
    goToLiveMode();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [goToLiveMode]);

  // Calculate connection status
  const isConnected = bluetoothState.status.isConnected;
  const isStreaming = bluetoothState.status.isStreaming;
  const isTraining = ecgState.trainingStatus.isLearning;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Connection Status Card */}
          <BluetoothConnectionCard />

          {/* Training Overlay (when in learning mode) */}
          {isTraining && <TrainingOverlay />}

          {/* Statistics Cards */}
          {isConnected && !isTraining && (
            <View style={styles.statsContainer}>
              <StatisticsCard />
            </View>
          )}

          {/* ECG Chart Section */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>
                📈 Real-time ECG
              </Text>
              {isStreaming && (
                <View style={styles.liveIndicator}>
                  <View style={[styles.liveDot, { opacity: ecgState.isLiveMode ? 1 : 0.3 }]} />
                  <Text style={[styles.liveText, { opacity: ecgState.isLiveMode ? 1 : 0.3 }]}>
                    {ecgState.isLiveMode ? 'LIVE' : 'PLAYBACK'}
                  </Text>
                </View>
              )}
            </View>

            {/* Time Window Selector */}
            <View style={styles.timeWindowSelector}>
              <Text style={styles.selectorLabel}>Time Window:</Text>
              <View style={styles.timeButtons}>
                {[5, 10, 15, 30].map((seconds) => (
                  <TouchableOpacity
                    key={seconds}
                    style={[
                      styles.timeButton,
                      selectedTimeWindow === seconds && styles.timeButtonActive
                    ]}
                    onPress={() => handleTimeWindowChange(seconds)}
                  >
                    <Text style={[
                      styles.timeButtonText,
                      selectedTimeWindow === seconds && styles.timeButtonTextActive
                    ]}>
                      {seconds}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ECG Chart with Swipe Gesture */}
            <PanGestureHandler
              onGestureEvent={handleSwipeGesture}
              activeOffsetX={[-10, 10]}
              failOffsetY={[-30, 30]}
            >
              <View style={styles.chartContainer}>
                <ECGChart />
                
                {/* Swipe Hint Overlay */}
                {!ecgState.isLiveMode && isStreaming && (
                  <View style={styles.swipeHint}>
                    <Ionicons name="swap-horizontal" size={16} color="#6b7280" />
                    <Text style={styles.swipeHintText}>Swipe to navigate timeline</Text>
                  </View>
                )}
              </View>
            </PanGestureHandler>

            {/* Timeline Controls */}
            <TimelineControls 
              onGoLive={handleGoLive}
              isLiveMode={ecgState.isLiveMode}
              currentViewStart={ecgState.viewStartTime}
              currentViewEnd={ecgState.viewEndTime}
              recordingDuration={
                ecgState.ecgTimestamps.length > 0 
                  ? (ecgState.ecgTimestamps[ecgState.ecgTimestamps.length - 1] - ecgState.recordingStartTime) / 1000
                  : 0
              }
            />
          </View>

          {/* Instructions Card (when not connected) */}
          {!isConnected && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>🫀 Getting Started</Text>
              <View style={styles.instructionsList}>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>1</Text>
                  <Text style={styles.instructionText}>Put on your Polar H10 chest strap</Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>2</Text>
                  <Text style={styles.instructionText}>Ensure it's properly moistened and positioned</Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>3</Text>
                  <Text style={styles.instructionText}>Tap "Scan for Devices" above</Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>4</Text>
                  <Text style={styles.instructionText}>Select your Polar H10 from the list</Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>5</Text>
                  <Text style={styles.instructionText}>Wait for training to complete, then monitor your heart rhythm!</Text>
                </View>
              </View>
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  The first 40 beats will be used for morphology training to personalize PVC detection for your heartbeat pattern.
                </Text>
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsContainer: {
    marginBottom: 16,
  },
  chartSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  timeWindowSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 12,
  },
  timeButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#10b981',
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  timeButtonTextActive: {
    color: '#ffffff',
  },
  chartContainer: {
    height: 300,
    borderRadius: 8,
    backgroundColor: '#000000',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#374151',
  },
  swipeHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  instructionsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionsList: {
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#dbeafe',
    marginLeft: 8,
    lineHeight: 18,
  },
});