import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea } from 'victory-native';
import { useECG } from '../context/ECGContext';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64; // Account for padding

export default function ECGChart() {
  const { state, getVisibleECGData, getVisiblePVCEvents } = useECG();
  
  const visibleData = getVisibleECGData();
  const visiblePVCEvents = getVisiblePVCEvents();
  
  // Transform ECG data for Victory charts
  const chartData = useMemo(() => {
    if (visibleData.timestamps.length === 0) return [];
    
    const startTime = state.recordingStartTime;
    
    return visibleData.timestamps.map((timestamp, index) => ({
      x: (timestamp - startTime) / 1000, // Convert to seconds relative to recording start
      y: visibleData.samples[index] || 0,
    }));
  }, [visibleData.timestamps, visibleData.samples, state.recordingStartTime]);

  // Transform PVC events for overlay
  const pvcMarkers = useMemo(() => {
    if (visiblePVCEvents.length === 0) return [];
    
    const startTime = state.recordingStartTime;
    
    return visiblePVCEvents.map(event => ({
      x: (event.timestamp - startTime) / 1000,
      confidence: event.confidence,
      pathway: event.detectionPathway,
      isInferred: event.isInferred,
    }));
  }, [visiblePVCEvents, state.recordingStartTime]);

  // Calculate Y-axis domain for better visualization
  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [-1000, 1000];
    
    const values = chartData.map(d => d.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    
    return [min - padding, max + padding];
  }, [chartData]);

  // X-axis domain based on current view
  const xDomain = useMemo((): [number, number] => {
    return [state.viewStartTime, state.viewEndTime];
  }, [state.viewStartTime, state.viewEndTime]);

  if (chartData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {state.trainingStatus.isLearning 
              ? '🎓 Training in progress...' 
              : '📊 Waiting for ECG data'}
          </Text>
          {state.trainingStatus.isLearning && (
            <Text style={styles.emptyStateSubtext}>
              Learning your heartbeat pattern ({state.trainingStatus.progress}/{state.trainingStatus.total})
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ECG Waveform Chart */}
      <VictoryChart
        width={chartWidth}
        height={280}
        domain={{ x: xDomain, y: yDomain }}
        padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
        style={{
          parent: { backgroundColor: 'transparent' }
        }}
      >
        {/* Grid Lines */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: '#374151', strokeWidth: 1 },
            grid: { stroke: '#374151', strokeWidth: 0.5 },
            tickLabels: { fill: '#9ca3af', fontSize: 10 },
          }}
          tickCount={6}
        />
        <VictoryAxis
          style={{
            axis: { stroke: '#374151', strokeWidth: 1 },
            grid: { stroke: '#374151', strokeWidth: 0.5 },
            tickLabels: { fill: '#9ca3af', fontSize: 10 },
          }}
          tickCount={8}
          tickFormat={(t) => `${t.toFixed(1)}s`}
        />

        {/* PVC Background Highlights */}
        {pvcMarkers.map((pvc, index) => (
          <VictoryArea
            key={`pvc-${index}`}
            data={[
              { x: pvc.x - 0.1, y: yDomain[0] },
              { x: pvc.x - 0.1, y: yDomain[1] },
              { x: pvc.x + 0.1, y: yDomain[1] },
              { x: pvc.x + 0.1, y: yDomain[0] },
            ]}
            style={{
              data: {
                fill: pvc.isInferred ? '#f59e0b' : '#ef4444',
                fillOpacity: Math.max(0.2, pvc.confidence * 0.6),
                stroke: pvc.isInferred ? '#f59e0b' : '#ef4444',
                strokeWidth: 1,
              }
            }}
          />
        ))}

        {/* ECG Waveform */}
        <VictoryLine
          data={chartData}
          style={{
            data: { 
              stroke: '#10b981', 
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }
          }}
          interpolation="linear"
        />
      </VictoryChart>

      {/* PVC Event Legend */}
      {pvcMarkers.length > 0 && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>PVC Detected</Text>
          </View>
          {pvcMarkers.some(pvc => pvc.isInferred) && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendText}>PVC Inferred</Text>
            </View>
          )}
        </View>
      )}

      {/* Chart Info Overlay */}
      <View style={styles.chartInfo}>
        <View style={styles.chartInfoItem}>
          <Text style={styles.chartInfoLabel}>Amplitude</Text>
          <Text style={styles.chartInfoValue}>μV</Text>
        </View>
        <View style={styles.chartInfoItem}>
          <Text style={styles.chartInfoLabel}>130 Hz</Text>
          <Text style={styles.chartInfoValue}>Sampling</Text>
        </View>
        <View style={styles.chartInfoItem}>
          <Text style={styles.chartInfoLabel}>
            {(state.viewEndTime - state.viewStartTime).toFixed(1)}s
          </Text>
          <Text style={styles.chartInfoValue}>Window</Text>
        </View>
      </View>

      {/* PVC Event Details (when PVCs are visible) */}
      {pvcMarkers.length > 0 && (
        <View style={styles.pvcDetails}>
          <Text style={styles.pvcDetailsTitle}>
            🚨 {pvcMarkers.length} PVC{pvcMarkers.length !== 1 ? 's' : ''} in view
          </Text>
          <View style={styles.pvcDetailsRow}>
            {pvcMarkers.slice(0, 3).map((pvc, index) => (
              <View key={index} style={styles.pvcDetailItem}>
                <Text style={styles.pvcDetailTime}>
                  {pvc.x.toFixed(1)}s
                </Text>
                <Text style={[
                  styles.pvcDetailPathway,
                  { color: pvc.isInferred ? '#f59e0b' : '#ef4444' }
                ]}>
                  {pvc.pathway === 'gap-detected' ? 'Gap' : 
                   pvc.pathway === 'high-amplitude' ? 'High-Amp' :
                   pvc.pathway === 'wide-qrs' ? 'Wide-QRS' :
                   pvc.pathway === 'morphology-only' ? 'Morphology' : 'Premature'}
                </Text>
                <Text style={styles.pvcDetailConfidence}>
                  {(pvc.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
            {pvcMarkers.length > 3 && (
              <Text style={styles.pvcMoreText}>
                +{pvcMarkers.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  legendContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    padding: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '500',
  },
  chartInfo: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    padding: 8,
  },
  chartInfoItem: {
    alignItems: 'center',
    marginBottom: 4,
  },
  chartInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  chartInfoValue: {
    fontSize: 10,
    color: '#9ca3af',
  },
  pvcDetails: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 6,
    padding: 8,
  },
  pvcDetailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  pvcDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pvcDetailItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  pvcDetailTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  pvcDetailPathway: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  pvcDetailConfidence: {
    fontSize: 9,
    color: '#fecaca',
    marginTop: 1,
  },
  pvcMoreText: {
    fontSize: 11,
    color: '#fecaca',
    fontStyle: 'italic',
  },
});