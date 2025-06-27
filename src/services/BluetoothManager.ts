import { BleManager, Device, Service, Characteristic, State } from 'react-native-ble-plx';
import { Alert } from 'react-native';

export interface ECGData {
  samples: number[];
  timestamps: number[];
  samplingRate: number;
}

export interface BluetoothStatus {
  isScanning: boolean;
  isConnected: boolean;
  isStreaming: boolean;
  deviceName?: string;
  batteryLevel?: number;
  signalQuality: number;
}

export type ECGDataCallback = (data: ECGData) => void;
export type StatusCallback = (status: BluetoothStatus) => void;

export class PolarH10Manager {
  private bleManager: BleManager | null = null;
  private device: Device | null = null;
  private ecgCharacteristic: Characteristic | null = null;
  private controlCharacteristic: Characteristic | null = null;
  
  // Polar H10 UUIDs (exact same as your Python code)
  private static readonly PMD_SERVICE_UUID = 'fb005c80-02e7-f387-1cad-8acd2d8df0c8';
  private static readonly PMD_CHAR1_UUID = 'fb005c81-02e7-f387-1cad-8acd2d8df0c8'; // Control
  private static readonly PMD_CHAR2_UUID = 'fb005c82-02e7-f387-1cad-8acd2d8df0c8'; // Data
  private static readonly BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
  private static readonly BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
  private static readonly DEVICE_INFO_SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
  private static readonly MODEL_NUMBER_UUID = '00002a24-0000-1000-8000-00805f9b34fb';
  
  // Polar H10 Commands (exact same as your Python code)
  private static readonly REQ_STREAM = new Uint8Array([0x01, 0x02]);
  private static readonly REQ_ECG = new Uint8Array([0x01, 0x00]);
  private static readonly START_STREAM = new Uint8Array([0x02, 0x00, 0x00, 0x01, 0x82, 0x00, 0x01, 0x01, 0x0E, 0x00]);
  private static readonly ECG_SAMPLING_FREQ = 130;
  
  private status: BluetoothStatus = {
    isScanning: false,
    isConnected: false,
    isStreaming: false,
    signalQuality: 0
  };
  
  private onECGData: ECGDataCallback | null = null;
  private onStatusChange: StatusCallback | null = null;
  private startTime: number = 0;
  private streamReady = false;

  constructor() {
    try {
      this.bleManager = new BleManager();
      this.setupBleManager();
    } catch (error) {
      console.log('BLE Manager initialization failed:', error);
      this.bleManager = null;
    }
  }

  private setupBleManager() {
    if (!this.bleManager) return;
    
    this.bleManager.onStateChange((state) => {
      console.log('📱 BLE State:', state);
      if (state === State.PoweredOn) {
        this.updateStatus({ ...this.status });
      }
    });
  }

  // Set callbacks
  setECGDataCallback(callback: ECGDataCallback) {
    this.onECGData = callback;
  }

  setStatusCallback(callback: StatusCallback) {
    this.onStatusChange = callback;
  }

  // Update status and notify
  private updateStatus(newStatus: Partial<BluetoothStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.onStatusChange?.(this.status);
  }

  // Scan for Polar devices
  async startScan(): Promise<Device[]> {
    if (!this.bleManager) {
      throw new Error('Bluetooth not available on this device');
    }

    this.updateStatus({ isScanning: true });
    const foundDevices: Device[] = [];

    try {
      console.log('🔍 Scanning for Polar devices...');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.bleManager!.stopDeviceScan();
          this.updateStatus({ isScanning: false });
          resolve(foundDevices);
        }, 15000); // 15 second scan

        this.bleManager!.startDeviceScan(null, null, (error, device) => {
          if (error) {
            console.error('❌ Scan error:', error);
            clearTimeout(timeout);
            this.updateStatus({ isScanning: false });
            reject(error);
            return;
          }

          if (device && device.name && device.name.includes('Polar')) {
            console.log(`✅ Found Polar device: ${device.name} (${device.id})`);
            
            // Avoid duplicates
            if (!foundDevices.some(d => d.id === device.id)) {
              foundDevices.push(device);
            }
          }
        });
      });
    } catch (error) {
      this.updateStatus({ isScanning: false });
      throw error;
    }
  }

  // Connect to specific device
  async connectToDevice(device: Device): Promise<void> {
    if (!this.bleManager) {
      throw new Error('Bluetooth not available');
    }

    try {
      console.log(`🔗 Connecting to ${device.name}...`);
      
      // Stop scanning first
      this.bleManager.stopDeviceScan();
      this.updateStatus({ isScanning: false });

      // Connect to device
      this.device = await device.connect();
      console.log('✅ Connected to device');

      // Discover services
      await this.device.discoverAllServicesAndCharacteristics();
      console.log('✅ Services discovered');

      // Get device info and battery
      await this.getDeviceInfo();

      // Setup ECG streaming
      await this.setupECGStream();

      this.updateStatus({ 
        isConnected: true, 
        deviceName: device.name || 'Polar Device' 
      });

    } catch (error) {
      console.error('❌ Connection failed:', error);
      await this.disconnect();
      throw error;
    }
  }

  // Get device information
  private async getDeviceInfo() {
    if (!this.device) return;

    try {
      // Get model number
      const modelChar = await this.device.readCharacteristicForService(
        PolarH10Manager.DEVICE_INFO_SERVICE_UUID,
        PolarH10Manager.MODEL_NUMBER_UUID
      );
      const modelName = modelChar.value ? atob(modelChar.value) : 'Unknown';
      console.log(`📱 Device model: ${modelName}`);

      // Get battery level
      const batteryChar = await this.device.readCharacteristicForService(
        PolarH10Manager.BATTERY_SERVICE_UUID,
        PolarH10Manager.BATTERY_LEVEL_UUID
      );
      
      if (batteryChar.value) {
        const batteryLevel = new Uint8Array(atob(batteryChar.value).split('').map(c => c.charCodeAt(0)))[0];
        console.log(`🔋 Battery level: ${batteryLevel}%`);
        this.updateStatus({ batteryLevel });
      }
    } catch (error) {
      console.warn('⚠️ Could not read device info:', error);
    }
  }

  // Setup ECG streaming (replicate your Python logic exactly)
  private async setupECGStream() {
    if (!this.device) throw new Error('No device connected');

    try {
      // Get characteristics - use characteristicsForService and take first one
      const controlChars = await this.device.characteristicsForService(
        PolarH10Manager.PMD_SERVICE_UUID
      );
      
      this.controlCharacteristic = controlChars.find(char => 
        char.uuid === PolarH10Manager.PMD_CHAR1_UUID
      ) || null;

      this.ecgCharacteristic = controlChars.find(char => 
        char.uuid === PolarH10Manager.PMD_CHAR2_UUID
      ) || null;

      if (!this.controlCharacteristic || !this.ecgCharacteristic) {
        throw new Error('Could not find required characteristics');
      }

      // Monitor control characteristic for stream ready signal
      this.controlCharacteristic.monitor((error, characteristic) => {
        if (error) {
          console.error('❌ Control monitor error:', error);
          return;
        }

        if (characteristic?.value) {
          const data = new Uint8Array(atob(characteristic.value).split('').map(c => c.charCodeAt(0)));
          
          // Check for stream ready signal (0xF0, 0x01)
          if (data.length >= 2 && data[0] === 0xF0 && data[1] === 0x01) {
            console.log('✅ Stream ready signal received');
            this.streamReady = true;
            this.sendStartCommand();
          }
        }
      });

      // Send initial commands (exact same sequence as Python)
      console.log('📡 Sending REQ_STREAM...');
      await this.controlCharacteristic.writeWithResponse(
        btoa(String.fromCharCode(...PolarH10Manager.REQ_STREAM))
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📡 Sending REQ_ECG...');
      await this.controlCharacteristic.writeWithResponse(
        btoa(String.fromCharCode(...PolarH10Manager.REQ_ECG))
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start monitoring ECG data
      this.ecgCharacteristic.monitor((error, characteristic) => {
        if (error) {
          console.error('❌ ECG monitor error:', error);
          return;
        }

        if (characteristic?.value) {
          this.processECGData(characteristic.value);
        }
      });

      console.log('✅ ECG stream setup complete');

    } catch (error) {
      console.error('❌ ECG setup failed:', error);
      throw error;
    }
  }

  // Send start command when stream is ready
  private async sendStartCommand() {
    if (!this.controlCharacteristic || !this.streamReady) return;

    try {
      console.log('📡 Sending START_STREAM command...');
      await this.controlCharacteristic.writeWithResponse(
        btoa(String.fromCharCode(...PolarH10Manager.START_STREAM))
      );

      this.updateStatus({ isStreaming: true });
      this.startTime = Date.now();
      console.log('✅ ECG streaming started!');

    } catch (error) {
      console.error('❌ Start command failed:', error);
    }
  }

  // Process ECG data (exact same logic as your Python code)
  private processECGData(base64Data: string) {
    try {
      const data = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));
      
      // Check data length (should be 229 bytes)
      if (data.length !== 229) {
        return;
      }

      const samples: number[] = [];
      const timestamps: number[] = [];
      const currentTime = (Date.now() - this.startTime) / 1000; // Seconds since start

      let samplesExtracted = 0;

      // Extract ECG samples (starting from byte 10, 3 bytes per sample)
      for (let i = 10; i < data.length; i += 3) {
        if (i + 2 < data.length) {
          // Convert 3 bytes to signed 24-bit integer
          const ecgRaw = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16));
          
          // Handle sign extension for 24-bit signed integer
          const ecgValue = ecgRaw > 0x7FFFFF ? ecgRaw - 0x1000000 : ecgRaw;
          
          const sampleTime = currentTime + (samplesExtracted / PolarH10Manager.ECG_SAMPLING_FREQ);
          
          samples.push(ecgValue);
          timestamps.push(sampleTime);
          samplesExtracted++;
        }
      }

      // Send to callback if we have data
      if (samples.length > 0 && this.onECGData) {
        this.onECGData({
          samples,
          timestamps,
          samplingRate: PolarH10Manager.ECG_SAMPLING_FREQ
        });
      }

      // Update signal quality based on data consistency
      const signalQuality = this.calculateSignalQuality(samples);
      this.updateStatus({ signalQuality });

    } catch (error) {
      console.error('❌ ECG data processing error:', error);
    }
  }

  // Calculate signal quality
  private calculateSignalQuality(samples: number[]): number {
    if (samples.length === 0) return 0;

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const snr = Math.abs(mean) / Math.sqrt(variance);
    
    return Math.min(1, snr / 10);
  }

  // Disconnect from device
  async disconnect() {
    try {
      this.streamReady = false;
      
      if (this.device?.isConnected) {
        await this.device.cancelConnection();
      }
      
      this.device = null;
      this.ecgCharacteristic = null;
      this.controlCharacteristic = null;
      
      this.updateStatus({
        isConnected: false,
        isStreaming: false,
        deviceName: undefined,
        batteryLevel: undefined,
        signalQuality: 0
      });
      
      console.log('👋 Disconnected from device');
    } catch (error) {
      console.error('❌ Disconnect error:', error);
    }
  }

  // Get current status
  getStatus(): BluetoothStatus {
    return this.status;
  }

  // Cleanup
  destroy() {
    this.disconnect();
    if (this.bleManager) {
      this.bleManager.destroy();
    }
  }
}