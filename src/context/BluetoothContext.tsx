import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { Device } from 'react-native-ble-plx';
import { PolarH10Manager, ECGData, BluetoothStatus } from '../services/BluetoothManager';

interface BluetoothState {
  status: BluetoothStatus;
  availableDevices: Device[];
  currentDevice: Device | null;
  isScanning: boolean;
  error: string | null;
}

type BluetoothAction = 
  | { type: 'SET_STATUS'; payload: BluetoothStatus }
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'SET_CURRENT_DEVICE'; payload: Device | null }
  | { type: 'SET_SCANNING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

interface BluetoothContextType {
  state: BluetoothState;
  startScan: () => Promise<void>;
  connectToDevice: (device: Device) => Promise<void>;
  disconnect: () => Promise<void>;
  setECGDataCallback: (callback: (data: ECGData) => void) => void;
  clearError: () => void;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

const initialState: BluetoothState = {
  status: {
    isScanning: false,
    isConnected: false,
    isStreaming: false,
    signalQuality: 0
  },
  availableDevices: [],
  currentDevice: null,
  isScanning: false,
  error: null,
};

function bluetoothReducer(state: BluetoothState, action: BluetoothAction): BluetoothState {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
        isScanning: action.payload.isScanning
      };
    case 'SET_DEVICES':
      return {
        ...state,
        availableDevices: action.payload
      };
    case 'SET_CURRENT_DEVICE':
      return {
        ...state,
        currentDevice: action.payload
      };
    case 'SET_SCANNING':
      return {
        ...state,
        isScanning: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    case 'RESET':
      return {
        ...initialState,
        status: state.status // Keep status from manager
      };
    default:
      return state;
  }
}

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bluetoothReducer, initialState);
  const polarManagerRef = useRef<PolarH10Manager | null>(null);

  // Initialize Polar manager if not exists
  const getPolarManager = useCallback(() => {
    if (!polarManagerRef.current) {
      polarManagerRef.current = new PolarH10Manager();
      
      // Set up status callback
      polarManagerRef.current.setStatusCallback((status: BluetoothStatus) => {
        dispatch({ type: 'SET_STATUS', payload: status });
      });
    }
    return polarManagerRef.current;
  }, []);

  const startScan = useCallback(async () => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_SCANNING', payload: true });
      
      const manager = getPolarManager();
      const devices = await manager.startScan();
      
      dispatch({ type: 'SET_DEVICES', payload: devices });
      dispatch({ type: 'SET_SCANNING', payload: false });
      
      console.log(`📱 Found ${devices.length} Polar devices`);
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Scan failed' });
      dispatch({ type: 'SET_SCANNING', payload: false });
    }
  }, [getPolarManager]);

  const connectToDevice = useCallback(async (device: Device) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const manager = getPolarManager();
      await manager.connectToDevice(device);
      
      dispatch({ type: 'SET_CURRENT_DEVICE', payload: device });
      console.log(`✅ Connected to ${device.name}`);
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Connection failed' });
      dispatch({ type: 'SET_CURRENT_DEVICE', payload: null });
    }
  }, [getPolarManager]);

  const disconnect = useCallback(async () => {
    try {
      const manager = getPolarManager();
      await manager.disconnect();
      
      dispatch({ type: 'SET_CURRENT_DEVICE', payload: null });
      dispatch({ type: 'SET_DEVICES', payload: [] });
      console.log('👋 Disconnected');
      
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Disconnect failed' });
    }
  }, [getPolarManager]);

  const setECGDataCallback = useCallback((callback: (data: ECGData) => void) => {
    const manager = getPolarManager();
    manager.setECGDataCallback(callback);
  }, [getPolarManager]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: BluetoothContextType = {
    state,
    startScan,
    connectToDevice,
    disconnect,
    setECGDataCallback,
    clearError,
  };

  return (
    <BluetoothContext.Provider value={contextValue}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
}