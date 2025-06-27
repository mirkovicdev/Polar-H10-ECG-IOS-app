import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useECG } from '../context/ECGContext';
import { BurdenCalculator } from '../utils/BurdenCalculator';

export default function StatisticsCard() {
  const { state } = useECG();
  const { detectionResult, currentBurden, trainingStatus } = state;

  // Don't show stats during training
  if (trainingStatus.isLearning) {
    return null;
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getHeartRateColor = (hr: number) => {
    if (hr === 0) return '#6b7280';
    if (hr < 60) return '#3b82f6'; // blue - bradycardia
    if (hr > 100) return '#f59e0b'; // amber - tachycardia
    return '#10b981'; // green - normal
  };

  const getBurdenCategoryIcon = (category: string) => {
    switch (category) {
      case 'low': return 'checkmark-circle';
      case 'moderate': return 'warning';
      case 'high': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Live Statistics</Text>
        <View style={styles.duration}>
          <Ionicons name="time" size={14} color="#9ca3af" />
          <Text style={styles.durationText}>
            {formatDuration(detectionResult.timeSpanMs)}
          </Text>
        </View>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        
        {/* Heart Rate */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons 
              name="heart" 
              size={20} 
              color={getHeartRateColor(detectionResult.heartRate)} 
            />
            <Text style={styles.statLabel}>Heart Rate</Text>
          </View>
          <Text style={[
            styles.statValue,
            { color: getHeartRateColor(detectionResult.heartRate) }
          ]}>
            {detectionResult.heartRate > 0 ? detectionResult.heartRate : '--'}
          </Text>
          <Text style={styles.statUnit}>BPM</Text>
        </View>

        {/* Total Beats */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="pulse" size={20} color="#10b981" />
            <Text style={styles.statLabel}>Total Beats</Text>
          </View>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {detectionResult.detectedBeats.toLocaleString()}
          </Text>
          <Text style={styles.statUnit}>beats</Text>
        </View>

        {/* PVC Count */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="flash" size={20} color="#ef4444" />
            <Text style={styles.statLabel}>PVC Count</Text>
          </View>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {detectionResult.pvcCount}
          </Text>
          <Text style={styles.statUnit}>PVCs</Text>
        </View>

        {/* Signal Quality */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="radio" size={20} color="#3b82f6" />
            <Text style={styles.statLabel}>Signal Quality</Text>
          </View>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>
            {(detectionResult.signalQuality * 100).toFixed(0)}
          </Text>
          <Text style={styles.statUnit}>%</Text>
        </View>

      </View>

      {/* PVC Burden Section */}
      {currentBurden && currentBurden.totalBeats > 10 && (
        <View style={styles.burdenSection}>
          <View style={styles.burdenHeader}>
            <View style={styles.burdenIcon}>
              <Ionicons 
                name={getBurdenCategoryIcon(currentBurden.burdenCategory)} 
                size={18} 
                color={BurdenCalculator.getBurdenColor(currentBurden.burdenCategory)} 
              />
            </View>
            <View style={styles.burdenInfo}>
              <Text style={styles.burdenTitle}>PVC Burden</Text>
              <Text style={styles.burdenSubtitle}>
                {BurdenCalculator.getClinicalInterpretation(currentBurden.burden, currentBurden.confidence)}
              </Text>
            </View>
            <View style={styles.burdenValue}>
              <Text style={[
                styles.burdenPercentage,
                { color: BurdenCalculator.getBurdenColor(currentBurden.burdenCategory) }
              ]}>
                {currentBurden.burden.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Burden Details */}
          <View style={styles.burdenDetails}>
            <View style={styles.burdenDetail}>
              <Text style={styles.burdenDetailLabel}>Confidence</Text>
              <View style={styles.confidenceBar}>
                <View style={[
                  styles.confidenceBarFill,
                  { 
                    width: `${currentBurden.confidence * 100}%`,
                    backgroundColor: BurdenCalculator.getConfidenceColor(currentBurden.confidence)
                  }
                ]} />
              </View>
              <Text style={[
                styles.burdenDetailValue,
                { color: BurdenCalculator.getConfidenceColor(currentBurden.confidence) }
              ]}>
                {(currentBurden.confidence * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.burdenMetrics}>
              <View style={styles.burdenMetric}>
                <Text style={styles.burdenMetricValue}>{currentBurden.pvcBeats}</Text>
                <Text style={styles.burdenMetricLabel}>PVCs</Text>
              </View>
              <View style={styles.burdenMetric}>
                <Text style={styles.burdenMetricValue}>{currentBurden.normalBeats}</Text>
                <Text style={styles.burdenMetricLabel}>Normal</Text>
              </View>
              <View style={styles.burdenMetric}>
                <Text style={styles.burdenMetricValue}>
                  {currentBurden.timeWindow.toFixed(1)}m
                </Text>
                <Text style={styles.burdenMetricLabel}>Duration</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Clinical Summary (for high burden) */}
      {currentBurden && currentBurden.burdenCategory === 'high' && (
        <View style={styles.clinicalAlert}>
          <View style={styles.alertIcon}>
            <Ionicons name="medical" size={16} color="#ef4444" />
          </View>
          <Text style={styles.alertText}>
            High PVC burden detected. Consider consulting with a cardiologist if symptoms persist.
          </Text>
        </View>
      )}

      {/* Data Quality Indicator */}
      <View style={styles.qualityIndicator}>
        <View style={styles.qualityMetrics}>
          <View style={styles.qualityMetric}>
            <View style={[
              styles.qualityDot,
              { backgroundColor: detectionResult.signalQuality > 0.7 ? '#10b981' : '#f59e0b' }
            ]} />
            <Text style={styles.qualityLabel}>
              Signal: {detectionResult.signalQuality > 0.7 ? 'Good' : 'Fair'}
            </Text>
          </View>
          
          {currentBurden && (
            <View style={styles.qualityMetric}>
              <View style={[
                styles.qualityDot,
                { backgroundColor: BurdenCalculator.getConfidenceColor(currentBurden.confidence) }
              ]} />
              <Text style={styles.qualityLabel}>
                Analysis: {currentBurden.confidence > 0.8 ? 'High' : 
                          currentBurden.confidence > 0.6 ? 'Good' : 
                          currentBurden.confidence > 0.4 ? 'Fair' : 'Low'} Confidence
              </Text>
            </View>
          )}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  statUnit: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  burdenSection: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  burdenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  burdenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  burdenInfo: {
    flex: 1,
  },
  burdenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  burdenSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  burdenValue: {
    alignItems: 'flex-end',
  },
  burdenPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  burdenDetails: {
    marginTop: 8,
  },
  burdenDetail: {
    marginBottom: 12,
  },
  burdenDetailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  burdenDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  burdenMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  burdenMetric: {
    alignItems: 'center',
  },
  burdenMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  burdenMetricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  clinicalAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  alertIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#fecaca',
    lineHeight: 18,
  },
  qualityIndicator: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  qualityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qualityMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  qualityLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
});