import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useECG } from '../context/ECGContext';

export default function TrainingOverlay() {
  const { state } = useECG();
  const { trainingStatus } = state;

  const progressPercentage = (trainingStatus.progress / trainingStatus.total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* Training Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="school" size={48} color="#f59e0b" />
        </View>

        {/* Title */}
        <Text style={styles.title}>🎓 Morphology Training</Text>
        <Text style={styles.subtitle}>Learning your heartbeat pattern...</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${progressPercentage}%` }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {trainingStatus.progress}/{trainingStatus.total} beats
          </Text>
        </View>

        {/* Progress Percentage */}
        <View style={styles.percentageContainer}>
          <Text style={styles.percentageText}>
            {Math.round(progressPercentage)}%
          </Text>
          <Text style={styles.percentageLabel}>Complete</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionItem}>
            <Ionicons name="body" size={16} color="#10b981" />
            <Text style={styles.instructionText}>Stay still and breathe normally</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time" size={16} color="#10b981" />
            <Text style={styles.instructionText}>Training takes about 1-2 minutes</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.instructionText}>PVC detection will start automatically</Text>
          </View>
        </View>

        {/* Training Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            The system is collecting samples of your normal heartbeat to create personalized templates for accurate PVC detection.
          </Text>
        </View>

        {/* Training Result Preview (if available) */}
        {trainingStatus.trainingResult && (
          <View style={styles.resultPreview}>
            <Text style={styles.resultTitle}>Training Progress:</Text>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>
                  {trainingStatus.trainingResult.clustersFound}
                </Text>
                <Text style={styles.resultLabel}>Clusters</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>
                  {trainingStatus.trainingResult.normalClusterSize}
                </Text>
                <Text style={styles.resultLabel}>Normal Beats</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={[
                  styles.resultValue,
                  { 
                    color: trainingStatus.trainingResult.confidence > 0.8 ? '#10b981' :
                           trainingStatus.trainingResult.confidence > 0.6 ? '#f59e0b' : '#ef4444'
                  }
                ]}>
                  {(trainingStatus.trainingResult.confidence * 100).toFixed(0)}%
                </Text>
                <Text style={styles.resultLabel}>Confidence</Text>
              </View>
            </View>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    minWidth: '2%', // Ensure visibility even at 0%
  },
  progressText: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    fontWeight: '600',
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f59e0b',
    lineHeight: 36,
  },
  percentageLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#d1d5db',
    marginLeft: 8,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#dbeafe',
    marginLeft: 8,
    lineHeight: 18,
  },
  resultPreview: {
    width: '100%',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultItem: {
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
});