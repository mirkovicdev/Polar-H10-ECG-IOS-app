import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface TimelineControlsProps {
  onGoLive: () => void;
  isLiveMode: boolean;
  currentViewStart: number;
  currentViewEnd: number;
  recordingDuration: number;
}

export default function TimelineControls({
  onGoLive,
  isLiveMode,
  currentViewStart,
  currentViewEnd,
  recordingDuration,
}: TimelineControlsProps) {

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoLive = () => {
    onGoLive();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const progressPercentage = recordingDuration > 0 
    ? Math.min(100, (currentViewEnd / recordingDuration) * 100)
    : 0;

  return (
    <View style={styles.container}>
      
      {/* Timeline Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Timeline Navigation</Text>
        <View style={styles.modeIndicator}>
          <View style={[
            styles.modeDot,
            { backgroundColor: isLiveMode ? '#ef4444' : '#f59e0b' }
          ]} />
          <Text style={[
            styles.modeText,
            { color: isLiveMode ? '#ef4444' : '#f59e0b' }
          ]}>
            {isLiveMode ? 'LIVE' : 'PLAYBACK'}
          </Text>
        </View>
      </View>

      {/* Current Time Display */}
      <View style={styles.timeDisplay}>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>Current View</Text>
          <Text style={styles.timeValue}>
            {formatTime(currentViewStart)} - {formatTime(currentViewEnd)}
          </Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>Total Duration</Text>
          <Text style={styles.timeValue}>
            {formatTime(recordingDuration)}
          </Text>
        </View>
      </View>

      {/* Timeline Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${progressPercentage}%` }
          ]} />
          <View style={[
            styles.progressHandle,
            { left: `${Math.max(0, progressPercentage - 2)}%` }
          ]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>0:00</Text>
          <Text style={styles.progressLabel}>{formatTime(recordingDuration)}</Text>
        </View>
      </View>

      {/* Navigation Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <View style={styles.instruction}>
            <Ionicons name="swap-horizontal" size={16} color="#6b7280" />
            <Text style={styles.instructionText}>Swipe chart left/right</Text>
          </View>
          {!isLiveMode && (
            <TouchableOpacity
              style={styles.liveButton}
              onPress={handleGoLive}
            >
              <Ionicons name="radio" size={16} color="#ffffff" />
              <Text style={styles.liveButtonText}>Go Live</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Playback Controls (when not in live mode) */}
      {!isLiveMode && (
        <View style={styles.playbackInfo}>
          <View style={styles.playbackCard}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.playbackText}>
              You're viewing historical data. Swipe the chart to navigate through your ECG timeline.
            </Text>
          </View>
        </View>
      )}

      {/* Live Mode Info */}
      {isLiveMode && (
        <View style={styles.liveInfo}>
          <View style={styles.liveCard}>
            <Ionicons name="radio" size={16} color="#10b981" />
            <Text style={styles.liveText}>
              Following live ECG data. Chart auto-scrolls with new samples.
            </Text>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressHandle: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  instructionsContainer: {
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 6,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  liveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 4,
  },
  playbackInfo: {
    marginTop: 8,
  },
  playbackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  playbackText: {
    flex: 1,
    fontSize: 12,
    color: '#dbeafe',
    marginLeft: 8,
    lineHeight: 16,
  },
  liveInfo: {
    marginTop: 8,
  },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#064e3b',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  liveText: {
    flex: 1,
    fontSize: 12,
    color: '#a7f3d0',
    marginLeft: 8,
    lineHeight: 16,
  },
});