import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea } from 'victory-native';

import { useECG } from '../context/ECGContext';
import { useBluetooth } from '../context/BluetoothContext';
import { BurdenCalculator } from '../utils/BurdenCalculator';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

type TimeRange = 'last30min' | 'fullSession';

export default function BurdenScreen() {
  const { state: ecgState } = useECG();
  const { state: bluetoothState } = useBluetooth();
  const [timeRange, setTimeRange] = useState<TimeRange>('last30min');

  const isConnected = bluetoothState.status.isConnected;
  const isTraining = ecgState.trainingStatus.isLearning;

  // Filter burden data based on time range
  const getVisibleData = () => {
    if (ecgState.burdenHistory.length === 0) return [];
    
    if (timeRange === 'last30min') {
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      return ecgState.burdenHistory.filter(point => point.timestamp >= thirtyMinutesAgo);
    }
    
    return ecgState.burdenHistory; // Full session
  };

  const visibleData = getVisibleData();
  const latestBurden = visibleData.length > 0 ? visibleData[visibleData.length - 1] : null;

  // Transform data for Victory chart
  const chartData = visibleData.map((point, index) => ({
    x: index,
    y: point.burden,
    timestamp: point.timestamp,
    confidence: point.confidence,
    totalBeats: point.totalBeats,
    pvcCount: point.pvcCount,
  }));

  // Calculate statistics
  const stats = visibleData.length > 0 ? {
    dataPoints: visibleData.length,
    peakBurden: Math.max(...visibleData.map(p => p.burden)),
    averageBurden: visibleData.reduce((sum, p) => sum + p.burden, 0) / visibleData.length,
    timeRangeLabel: timeRange === 'last30min' ? '30 minutes' : 'Full session'
  } : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Header with Controls */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>📊 Temporal PVC Burden</Text>
            <Text style={styles.subtitle}>5-minute sliding window analysis</Text>
            {latestBurden && (
              <Text style={[
                styles.currentBurden,
                { color: BurdenCalculator.getBurdenColor(
                  latestBurden.burden < 1 ? 'low' :
                  latestBurden.burden < 10 ? 'moderate' : 'high'
                )}
              ]}>
                Current: {latestBurden.burden.toFixed(1)}%
              </Text>
            )}
          </View>
          
          {/* Time Range Selector */}
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'last30min' && styles.timeRangeButtonActive
              ]}
              onPress={() => setTimeRange('last30min')}
            >
              <Text style={[
                styles.timeRangeButtonText,
                timeRange === 'last30min' && styles.timeRangeButtonTextActive
              ]}>
                Last 30min
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'fullSession' && styles.timeRangeButtonActive
              ]}
              onPress={() => setTimeRange('fullSession')}
            >
              <Text style={[
                styles.timeRangeButtonText,
                timeRange === 'fullSession' && styles.timeRangeButtonTextActive
              ]}>
                Full Session
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          {chartData.length > 0 ? (
            <VictoryChart
              width={chartWidth}
              height={320}
              domain={{ y: [0, 50] }} // 0-50% range
              padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
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
                  tickLabels: { fill: '#ffffff', fontSize: 12 },
                }}
                tickCount={6}
                tickFormat={(t) => `${t}%`}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: '#374151', strokeWidth: 1 },
                  grid: { stroke: '#374151', strokeWidth: 0.5 },
                  tickLabels: { fill: '#ffffff', fontSize: 10 },
                }}
                tickCount={6}
                tickFormat={(t) => {
                  const index = Math.floor(t);
                  if (chartData[index]) {
                    const time = new Date(chartData[index].timestamp);
                    return time.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                  }
                  return '';
                }}
              />

              {/* Burden Area Chart */}
              <VictoryArea
                data={chartData}
                style={{
                  data: {
                    fill: '#ef4444',
                    fillOpacity: 0.3,
                    stroke: '#ef4444',
                    strokeWidth: 2,
                  }
                }}
                interpolation="monotoneX"
              />

              {/* Burden Line */}
              <VictoryLine
                data={chartData}
                style={{
                  data: { 
                    stroke: '#ef4444', 
                    strokeWidth: 2,
                  }
                }}
                interpolation="monotoneX"
              />
            </VictoryChart>
          ) : (
            <View style={styles.emptyChart}>
              {isTraining ? (
                <>
                  <Ionicons name="school" size={48} color="#f59e0b" />
                  <Text style={styles.emptyChartText}>Training in Progress</Text>
                  <Text style={styles.emptyChartSubtext}>
                    Burden analysis will start after morphology training completes
                  </Text>
                </>
              ) : isConnected ? (
                <>
                  <Ionicons name="time" size={48} color="#6b7280" />
                  <Text style={styles.emptyChartText}>Collecting Burden Data</Text>
                  <Text style={styles.emptyChartSubtext}>
                    Need 5+ minutes of data for analysis
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="bluetooth" size={48} color="#6b7280" />
                  <Text style={styles.emptyChartText}>Connect to Polar H10</Text>
                  <Text style={styles.emptyChartSubtext}>
                    Start ECG monitoring to view burden analysis
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Statistics Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>📈 Session Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="analytics" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.statLabel}>Data Points</Text>
                <Text style={styles.statValue}>{stats.dataPoints}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="trending-up" size={20} color="#ef4444" />
                </View>
                <Text style={styles.statLabel}>Peak Burden</Text>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>
                  {stats.peakBurden.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="stats-chart" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.statLabel}>Average Burden</Text>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                  {stats.averageBurden.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="time" size={20} color="#10b981" />
                </View>
                <Text style={styles.statLabel}>Time Range</Text>
                <Text style={[styles.statValue, { color: '#10b981' }]}>
                  {stats.timeRangeLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Clinical Interpretation */}
        {latestBurden && (
          <View style={styles.clinicalSection}>
            <Text style={styles.clinicalTitle}>🏥 Clinical Assessment</Text>
            
            <View style={[
              styles.clinicalCard,
              { 
                borderColor: BurdenCalculator.getBurdenColor(
                  latestBurden.burden < 1 ? 'low' :
                  latestBurden.burden < 10 ? 'moderate' : 'high'
                )
              }
            ]}>
              <View style={styles.clinicalHeader}>
                <Ionicons 
                  name={
                    latestBurden.burden < 1 ? 'checkmark-circle' :
                    latestBurden.burden < 10 ? 'warning' : 'alert-circle'
                  }
                  size={24} 
                  color={BurdenCalculator.getBurdenColor(
                    latestBurden.burden < 1 ? 'low' :
                    latestBurden.burden < 10 ? 'moderate' : 'high'
                  )}
                />
                <Text style={[
                  styles.clinicalCategory,
                  { 
                    color: BurdenCalculator.getBurdenColor(
                      latestBurden.burden < 1 ? 'low' :
                      latestBurden.burden < 10 ? 'moderate' : 'high'
                    )
                  }
                ]}>
                  {latestBurden.burden < 1 ? 'Low PVC Burden' :
                   latestBurden.burden < 10 ? 'Moderate PVC Burden' : 'High PVC Burden'}
                </Text>
              </View>
              
              <Text style={styles.clinicalInterpretation}>
                {BurdenCalculator.getClinicalInterpretation(latestBurden.burden, latestBurden.confidence)}
              </Text>
              
              <View style={styles.clinicalMetrics}>
                <View style={styles.clinicalMetric}>
                  <Text style={styles.clinicalMetricValue}>{latestBurden.pvcCount}</Text>
                  <Text style={styles.clinicalMetricLabel}>PVCs in 5min</Text>
                </View>
                <View style={styles.clinicalMetric}>
                  <Text style={styles.clinicalMetricValue}>{latestBurden.totalBeats}</Text>
                  <Text style={styles.clinicalMetricLabel}>Total beats</Text>
                </View>
                <View style={styles.clinicalMetric}>
                  <Text style={[
                    styles.clinicalMetricValue,
                    { color: BurdenCalculator.getConfidenceColor(latestBurden.confidence) }
                  ]}>
                    {(latestBurden.confidence * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.clinicalMetricLabel}>Confidence</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ About Burden Analysis</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              PVC burden is calculated using a 5-minute sliding window that continuously analyzes your heartbeat data. 
              This provides real-time assessment of arrhythmia frequency over time.
            </Text>
            
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={[styles.infoDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.infoItemText}>
                  <Text style={styles.infoBold}>Low (&lt;1%):</Text> Typically benign, minimal clinical significance
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.infoItemText}>
                  <Text style={styles.infoBold}>Moderate (1-10%):</Text> Monitor for symptoms, may require evaluation
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.infoItemText}>
                  <Text style={styles.infoBold}>High (&gt;10%):</Text> Often clinically significant, consider cardiology consultation
                </Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  currentBurden: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  timeRangeButtonTextActive: {
    color: '#ffffff',
  },
  chartSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyChart: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyChartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  clinicalSection: {
    marginBottom: 20,
  },
  clinicalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  clinicalCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
  },
  clinicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clinicalCategory: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  clinicalInterpretation: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 16,
  },
  clinicalMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  clinicalMetric: {
    alignItems: 'center',
  },
  clinicalMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  clinicalMetricLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoList: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  infoItemText: {
    flex: 1,
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
    color: '#ffffff',
  },
});