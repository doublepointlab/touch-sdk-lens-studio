import Event from "./Event"

export class SensorData {
    public grav: vec3;
    public gyro: vec3;
}

class WatchDevice {
    public name: string;
    public address: any;
    private bluetoothModule: Bluetooth.BluetoothCentralModule;
    private gatt;
    public outputCharacteristic;
    public inputCharacteristic;
    private pinchActive: boolean;
    private eventListeners: {sensors: Function[], gesture: Function[]};

    constructor(name:string, address:any, bluetoothModule: Bluetooth.BluetoothCentralModule) {
        this.name = name;
        this.address = address;
        this.bluetoothModule = bluetoothModule;
        this.gatt = null;
        this.outputCharacteristic = null;
        this.inputCharacteristic = null;
        this.pinchActive = false;
        this.eventListeners = {sensors: [], gesture: []};
    }

    async connect(onConnect:Function, onDisconnect: Function) {
        
        try {
            this.gatt = await this.bluetoothModule.connectGatt(this.address);

            this.gatt.onConnectionStateChangedEvent.add((event) => {
                if (event.state === 0) {
                    if (onDisconnect) {
                        try {
                            onDisconnect(event);
                        } catch (error) {
                            print("Error in onDisconnect callback:" + error);
                        }
                    }
                }
            });

            await this.requestMtu();
            await this.discoverServices();

            print("WatchDevice: connect() finished successfully.");

            if (onConnect) {
                try {
                    onConnect(this);
                } catch (error) {
                    print("Error in onConnect callback:" + error);
                }
            }

        } catch (error) {
            print("WatchDevice: connect() failed with error:" + error);
            throw error;
        }
    }


    public addEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type].push(callback);
        }
    }

    private emit(type, data) {
        for (const cb of this.eventListeners[type] || []) {
            cb(data);
        }
    }

    private async requestMtu() {
        try {
            await this.gatt.requestMtu(512);
        } catch (e) {
            print("MTU request failed, continuing with default.");
        }
    }

    private parse(data) {
        const tap = (data[0] === 64) || (data[0] === 17);
        const pinchProb = data[1] / 255;
        
        const grav = this.floatArrayToVec3(this.bytesToFloat16Array(data.slice(2, 8)));
        const gyro = this.floatArrayToVec3(this.bytesToFloat32Array(data.slice(8)));

        this.emit("sensors", {"grav": grav, "gyro": gyro});

        if ((tap || pinchProb > 0.6) && !this.pinchActive) {
            this.pinchActive = true;
            this.emit("gesture", "pinch");
        } else if (pinchProb < 0.3 && this.pinchActive) {
            this.pinchActive = false;
            this.emit("gesture", "release");
        }
    }

    async discoverServices() {
        const services = this.gatt.getServices();
        const protobufService = services.find(s => s.uuid.toLowerCase() === "f9d60370-5325-4c64-b874-a68c7c555bad");
        if (!protobufService) throw new Error("Hax service not found");
        const characteristics = protobufService.getCharacteristics();
        this.outputCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === "f9d60380-5325-4c64-b874-a68c7c555bad");
        //this.inputCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === "f9d60372-5325-4c64-b874-a68c7c555bad");

        if (!this.outputCharacteristic)
            throw new Error("Hax characteristic not found");
        
        await this.outputCharacteristic.registerNotifications((value) => {
            this.parse(value);            
        });
    }

    private bytesToFloat32Array(arr: Uint8Array): number[] {
        var result = [];
        let bytes = new DataView(arr.buffer);
        for (let i = 0; i < bytes.byteLength; i += 4) {
            result.push(bytes.getFloat32(i, true))
        }
        return result
    }

    private bytesToFloat16Array(arr: Uint8Array): number[] {
        var result = [];
        let bytes = new DataView(arr.buffer);
        for (let i = 0; i < bytes.byteLength; i += 2) {
            result.push(bytes.getInt16(i, true) / 32767);
        }
        return result
    }

    private floatArrayToVec3(arr: number[]): vec3 {
        return new vec3(arr[0], arr[1], arr[2]);
    }
}


class WatchScanner {
    private bluetoothModule: Bluetooth.BluetoothCentralModule;
    private isScanning: boolean;
    private deviceName:string;
    private debugLogAllDevices: boolean = false;

    constructor(bluetoothModule: Bluetooth.BluetoothCentralModule, deviceName:string, debugLogAllDevices:boolean) {
        this.bluetoothModule = bluetoothModule;
        this.isScanning = false;
        this.deviceName = deviceName;
        this.debugLogAllDevices = debugLogAllDevices;
    }

    public start(onDeviceFound:Function) {
        if (this.isScanning) {
            return;
        }

        this.isScanning = true;

        print(`Starting scan`);
        
        const scanFilter = new Bluetooth.ScanFilter();
        const scanSettings = new Bluetooth.ScanSettings();
        scanSettings.timeoutSeconds = 15;
        scanSettings.scanMode = Bluetooth.ScanMode.LowPower;

        const watchNameIsEmpty = this.deviceName === "";

        this.bluetoothModule.startScan(
                [scanFilter], 
                scanSettings,         
        (result) => {
            if(this.debugLogAllDevices){
                print("Device found: " + result.deviceName);
            }

            if (result.deviceName === this.deviceName || (watchNameIsEmpty && result.deviceName.startsWith("DP"))) {
                print("Device found with name" + result.deviceName);
                const watchDevice = new WatchDevice(result.deviceName, result.deviceAddress, this.bluetoothModule);
                onDeviceFound(watchDevice);
            }
        });
    }

    public stop() {
        if (!this.isScanning) return;
        this.bluetoothModule.stopScan();
        this.isScanning = false;
    }
}


@component
export class TouchSdk extends BaseScriptComponent {

    @input 
    bluetoothCentralModule : Bluetooth.BluetoothCentralModule;

    @input 
    watchName : string;

    @input 
    debugLogAllDevices : boolean = false;;

    private scanner: WatchScanner;

    private onDeviceConnectedEvent = new Event<string>()
    private onPinchStartEvent = new Event<string>()
    private onPinchReleaseEvent = new Event<string>()
    private onSensorUpdateEvent = new Event<SensorData>()

    /**
     * Called whenever device is connected.
     */
    public onDeviceConnected = this.onDeviceConnectedEvent.publicApi()

    /**
     * Called when pinch starts.
     */
    public onPinchStart = this.onPinchStartEvent.publicApi()

    /**
     * Called when pinch ends.
     */
    public onPinchRelease = this.onPinchReleaseEvent.publicApi()

    /**
     * Called whenever sensor data is updated.
     */
    public onSensorUpdate = this.onSensorUpdateEvent.publicApi()

    onAwake() {
        this.startScannningDevices();
    }


    private startScannningDevices() {
        print("Startin scanning for devices...");
        this.scanner = new WatchScanner(this.bluetoothCentralModule, this.watchName, this.debugLogAllDevices);
        this.scanner.start((device) => {
            print(`Found device: ${device.name}`);
            this.connectToDevice(device);
        });
    }

    private onConnectionFailed() {
        print("Connection failed");
        this.scanner.stop();
    }


    private connectToDevice(device: WatchDevice) {


        var  onConnect = (connectedDevice:WatchDevice) => {
            print("Connected to device:" + connectedDevice.name);
            this.onDeviceConnectedEvent.invoke(connectedDevice.name);
            
            this.scanner.stop();
            var currentSensorData = new SensorData();
            
            connectedDevice.addEventListener("sensors", (values) => {
                currentSensorData.grav = values.grav; // normalized
                currentSensorData.gyro = values.gyro;

                this.onSensorUpdateEvent.invoke(currentSensorData);
            });

            connectedDevice.addEventListener("gesture", (gesture: string) => {
                if(gesture === "pinch") {
                    this.onPinchStartEvent.invoke("pinch start");
                }
                else if(gesture === "release") {
                    this.onPinchReleaseEvent.invoke("pinch release");
                }
            });
        };

        var  onDisconnect = (event) => {
            print("Disconnected from device:" + event);
        };

        try {
            device.connect(onConnect,onDisconnect)
        }
        catch(error){
            print(error)
            this.onConnectionFailed();
        };

    }

}