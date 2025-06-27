import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { ImprovedPVCDetector, PVCDetectionResult } from '../utils/PVCDetector';
import { BeatHistoryManager } from '../utils/BeatHistory';

import { BurdenCalculator, BurdenStats } from '../utils/BurdenCalculator';
import { useBluetooth } from './BluetoothContext';
import { BurdenDataPoint, TemporalBurdenCalculator } from '../utils/TemporalBurden';

interface ECGState {
  // Raw ECG data for plotting
  ecgSamples: number[];
  ecgTimestamps: number[];
  
  // Detection results
  detectionResult: PVCDetectionResult;
  
  // Burden analysis
  burdenHistory: BurdenDataPoint[];
  currentBurden: BurdenStats | null;
  
  // Timeline navigation
  isLiveMode: boolean;
  viewStartTime: number;
  viewEndTime: number;
  recordingStartTime: number;
  
  // Chart settings
  timeWindowSeconds: number;
  
  // Training status
  trainingStatus: {
    isLearning: boolean;
    progress: number;
    total: number;
    trainingResult: any;
  };
}

type ECGAction = 
  | { type: 'ADD_ECG_DATA'; payload: { samples: number[]; timestamps: number[] } }
  | { type: 'UPDATE_DETECTION_RESULT'; payload: PVCDetectionResult }
  | { type: 'UPDATE_BURDEN_HISTORY'; payload: BurdenDataPoint[] }
  | { type: 'UPDATE_CURRENT_BURDEN'; payload: BurdenStats }
  | { type: 'SET_LIVE_MODE'; payload: boolean }
  | { type: 'SET_VIEW_TIME_RANGE'; payload: { start: number; end: number } }
  | { type: 'SET_TIME_WINDOW'; payload: number }
  | { type: 'UPDATE_TRAINING_STATUS'; payload: { isLearning: boolean; progress: number; total: number; trainingResult: any } }
  | { type: 'RESET_RECORDING' }
  | { type: 'INIT_RECORDING'; payload: number };

interface ECGContextType {
  state: ECGState;
  // Timeline navigation
  goToLiveMode: () => void;
  setViewTimeRange: (start: number, end: number) => void;
  navigateTimeline: (deltaSeconds: number) => void;
  setTimeWindow: (seconds: number) => void;
  // Data management
  resetRecording: () => void;
  // Getters for components
  getVisibleECGData: () => { samples: number[]; timestamps: number[] };
  getVisiblePVCEvents: () => any[];
}

const ECGContext = createContext<ECGContextType | undefined>(undefined);

const initialState: ECGState = {
  ecgSamples: [],
  ecgTimestamps: [],
  detectionResult: {
    pvcCount: 0,
    totalBeats: 0,
    detectedBeats: 0,
    heartRate: 0,
    isPVC: false,
    pvcEvents: [],
    timeSpanMs: 0,
    signalQuality: 0
  },
  burdenHistory: [],
  currentBurden: null,
  isLiveMode: true,
  viewStartTime: 0,
  viewEndTime: 10,
  recordingStartTime: 0,
  timeWindowSeconds: 10,
  trainingStatus: {
    isLearning: true,
    progress: 0,
    total: 40,
    trainingResult: null
  }
};

function ecgReducer(state: ECGState, action: ECGAction): ECGState {
  switch (action.type) {
    case 'ADD_ECG_DATA':
      const { samples, timestamps } = action.payload;
      const maxSamples = 130 * 300; // 5 minutes at 130Hz
      
      const newSamples = [...state.ecgSamples, ...samples];
      const newTimestamps = [...state.ecgTimestamps, ...timestamps];
      
      // Keep only recent data
      const trimmedSamples = newSamples.length > maxSamples ? newSamples.slice(-maxSamples) : newSamples;
      const trimmedTimestamps = newTimestamps.length > maxSamples ? newTimestamps.slice(-maxSamples) : newTimestamps;
      
      // Auto-update view range if in live mode
      let viewStart = state.viewStartTime;
      let viewEnd = state.viewEndTime;
      
      if (state.isLiveMode && trimmedTimestamps.length > 0) {
        const latestTime = trimmedTimestamps[trimmedTimestamps.length - 1];
        const relativeTime = latestTime - state.recordingStartTime;
        viewEnd = relativeTime;
        viewStart = Math.max(0, viewEnd - state.timeWindowSeconds);
      }
      
      return {
        ...state,
        ecgSamples: trimmedSamples,
        ecgTimestamps: trimmedTimestamps,
        viewStartTime: viewStart,
        viewEndTime: viewEnd
      };

    case 'UPDATE_DETECTION_RESULT':
      return {
        ...state,
        detectionResult: action.payload
      };

    case 'UPDATE_BURDEN_HISTORY':
      return {
        ...state,
        burdenHistory: action.payload
      };

    case 'UPDATE_CURRENT_BURDEN':
      return {
        ...state,
        currentBurden: action.payload
      };

    case 'SET_LIVE_MODE':
      let newViewStart = state.viewStartTime;
      let newViewEnd = state.viewEndTime;
      
      if (action.payload && state.ecgTimestamps.length > 0) {
        // Switch to live mode - jump to latest data
        const latestTime = state.ecgTimestamps[state.ecgTimestamps.length - 1];
        const relativeTime = latestTime - state.recordingStartTime;
        newViewEnd = relativeTime;
        newViewStart = Math.max(0, newViewEnd - state.timeWindowSeconds);
      }
      
      return {
        ...state,
        isLiveMode: action.payload,
        viewStartTime: newViewStart,
        viewEndTime: newViewEnd
      };

    case 'SET_VIEW_TIME_RANGE':
      return {
        ...state,
        viewStartTime: action.payload.start,
        viewEndTime: action.payload.end,
        isLiveMode: false // Disable live mode when manually setting view
      };

    case 'SET_TIME_WINDOW':
      const windowSeconds = action.payload;
      // Adjust view end to maintain window size
      const newEnd = state.viewStartTime + windowSeconds;
      
      return {
        ...state,
        timeWindowSeconds: windowSeconds,
        viewEndTime: newEnd
      };

    case 'UPDATE_TRAINING_STATUS':
      return {
        ...state,
        trainingStatus: action.payload
      };

    case 'INIT_RECORDING':
      return {
        ...state,
        recordingStartTime: action.payload,
        viewStartTime: 0,
        viewEndTime: state.timeWindowSeconds,
        isLiveMode: true
      };

    case 'RESET_RECORDING':
      return {
        ...initialState,
        timeWindowSeconds: state.timeWindowSeconds // Preserve user settings
      };

    default:
      return state;
  }
}

export function ECGProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ecgReducer, initialState);
  const { setECGDataCallback, state: bluetoothState } = useBluetooth();
  
  // Detection and analysis engines
  const pvcDetectorRef = useRef(new ImprovedPVCDetector(130));
  const beatHistoryManagerRef = useRef(new BeatHistoryManager());
  const temporalBurdenCalculatorRef = useRef(new TemporalBurdenCalculator());
  const lastBurdenUpdateRef = useRef(0);

  // Initialize ECG data callback
  useEffect(() => {
    setECGDataCallback((data) => {
      // Add new ECG data to state
      dispatch({ 
        type: 'ADD_ECG_DATA', 
        payload: { 
          samples: data.samples, 
          timestamps: data.timestamps 
        } 
      });

      // Process each sample through PVC detector
      data.samples.forEach((amplitude, i) => {
        const timestamp = data.timestamps[i] * 1000; // Convert to milliseconds
        
        // Initialize recording start time on first sample
        if (state.recordingStartTime === 0) {
          dispatch({ type: 'INIT_RECORDING', payload: timestamp });
        }
        
        const result = pvcDetectorRef.current.processECGSample(amplitude, timestamp);
        
        // Update training status
        const trainingStatus = pvcDetectorRef.current.getTrainingStatus();
        dispatch({ 
          type: 'UPDATE_TRAINING_STATUS', 
          payload: trainingStatus 
        });
        
        // Update detection result
        dispatch({ 
          type: 'UPDATE_DETECTION_RESULT', 
          payload: result 
        });
        
        // Handle beat detection for burden analysis (only after training)
        if (!trainingStatus.isLearning) {
          const prevBeats = beatHistoryManagerRef.current.getTotalBeats();
          
          if (result.detectedBeats > prevBeats) {
            // New beat detected
            const latestPVC = result.pvcEvents[result.pvcEvents.length - 1];
            const isPVC = latestPVC && Math.abs(latestPVC.timestamp - timestamp) < 500;
            
            beatHistoryManagerRef.current.addBeat(timestamp, isPVC || false);
            
            console.log('[💓] Beat detected:', new Date(timestamp).toLocaleTimeString(), '| PVC:', isPVC);
          }
          
          // Update burden every 30 seconds if we have enough beats
          const now = Date.now();
          if (now - lastBurdenUpdateRef.current >= 30000 && result.detectedBeats >= 10) {
            console.log('[📊] Updating temporal burden');
            
            const allBeats = beatHistoryManagerRef.current.getAllBeats();
            if (allBeats.length > 0) {
              const latestBeatTime = allBeats[allBeats.length - 1].timestamp;
              
              const burdenPoint = temporalBurdenCalculatorRef.current.calculateSlidingBurden(
                allBeats, 
                latestBeatTime
              );
              
              // Use browser timestamp for chart display
              const burdenPointWithBrowserTime = {
                ...burdenPoint,
                timestamp: now
              };
              
              temporalBurdenCalculatorRef.current.addBurdenPoint(burdenPointWithBrowserTime);
              
              dispatch({ 
                type: 'UPDATE_BURDEN_HISTORY', 
                payload: temporalBurdenCalculatorRef.current.getBurdenHistory() 
              });
              
              // Update current burden stats
              const currentBurden = BurdenCalculator.calculateBurden(
                result.detectedBeats,
                result.pvcCount,
                result.timeSpanMs,
                result.heartRate
              );
              
              dispatch({ 
                type: 'UPDATE_CURRENT_BURDEN', 
                payload: currentBurden 
              });
              
              lastBurdenUpdateRef.current = now;
            }
          }
        }
      });
    });
  }, [setECGDataCallback, state.recordingStartTime]);

  // Reset detection when disconnected
  useEffect(() => {
    if (!bluetoothState.status.isConnected) {
      resetRecording();
    }
  }, [bluetoothState.status.isConnected]);

  const goToLiveMode = useCallback(() => {
    dispatch({ type: 'SET_LIVE_MODE', payload: true });
  }, []);

  const setViewTimeRange = useCallback((start: number, end: number) => {
    dispatch({ type: 'SET_VIEW_TIME_RANGE', payload: { start, end } });
  }, []);

  const navigateTimeline = useCallback((deltaSeconds: number) => {
    const newStart = Math.max(0, state.viewStartTime + deltaSeconds);
    const newEnd = newStart + state.timeWindowSeconds;
    
    // Don't go beyond available data
    if (state.ecgTimestamps.length > 0) {
      const maxTime = state.ecgTimestamps[state.ecgTimestamps.length - 1] - state.recordingStartTime;
      if (newEnd > maxTime) {
        // Hit the end - go to live mode
        goToLiveMode();
        return;
      }
    }
    
    setViewTimeRange(newStart, newEnd);
  }, [state.viewStartTime, state.timeWindowSeconds, state.ecgTimestamps, state.recordingStartTime, goToLiveMode, setViewTimeRange]);

  const setTimeWindow = useCallback((seconds: number) => {
    dispatch({ type: 'SET_TIME_WINDOW', payload: seconds });
  }, []);

  const resetRecording = useCallback(() => {
    // Reset all detection engines
    pvcDetectorRef.current.reset();
    beatHistoryManagerRef.current.clear();
    temporalBurdenCalculatorRef.current.clear();
    lastBurdenUpdateRef.current = 0;
    
    // Reset state
    dispatch({ type: 'RESET_RECORDING' });
    
    console.log('🔄 ECG recording reset');
  }, []);

  // Get visible ECG data based on current view
  const getVisibleECGData = useCallback(() => {
    if (state.ecgTimestamps.length === 0) {
      return { samples: [], timestamps: [] };
    }
    
    const absoluteStartTime = state.recordingStartTime + (state.viewStartTime * 1000);
    const absoluteEndTime = state.recordingStartTime + (state.viewEndTime * 1000);
    
    const startIndex = state.ecgTimestamps.findIndex(time => time >= absoluteStartTime);
    const endIndex = state.ecgTimestamps.findIndex(time => time > absoluteEndTime);
    
    const actualStartIndex = Math.max(0, startIndex === -1 ? 0 : startIndex);
    const actualEndIndex = endIndex === -1 ? state.ecgTimestamps.length : endIndex;
    
    return {
      samples: state.ecgSamples.slice(actualStartIndex, actualEndIndex),
      timestamps: state.ecgTimestamps.slice(actualStartIndex, actualEndIndex)
    };
  }, [state.ecgSamples, state.ecgTimestamps, state.recordingStartTime, state.viewStartTime, state.viewEndTime]);

  // Get visible PVC events
  const getVisiblePVCEvents = useCallback(() => {
    const absoluteStartTime = state.recordingStartTime + (state.viewStartTime * 1000);
    const absoluteEndTime = state.recordingStartTime + (state.viewEndTime * 1000);
    
    return state.detectionResult.pvcEvents.filter(event => 
      event.timestamp >= absoluteStartTime && event.timestamp <= absoluteEndTime
    );
  }, [state.detectionResult.pvcEvents, state.recordingStartTime, state.viewStartTime, state.viewEndTime]);

  const contextValue: ECGContextType = {
    state,
    goToLiveMode,
    setViewTimeRange,
    navigateTimeline,
    setTimeWindow,
    resetRecording,
    getVisibleECGData,
    getVisiblePVCEvents,
  };

  return (
    <ECGContext.Provider value={contextValue}>
      {children}
    </ECGContext.Provider>
  );
}

export function useECG() {
  const context = useContext(ECGContext);
  if (context === undefined) {
    throw new Error('useECG must be used within an ECGProvider');
  }
  return context;
}