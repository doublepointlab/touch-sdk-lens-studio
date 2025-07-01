"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TouchSdk = exports.SensorData = void 0;
var __selfType = requireType("./TouchSdk");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Event_1 = require("./Event");
class SensorData {
}
exports.SensorData = SensorData;
class WatchDevice {
    constructor(name, address, bluetoothModule) {
        this.name = name;
        this.address = address;
        this.bluetoothModule = bluetoothModule;
        this.gatt = null;
        this.outputCharacteristic = null;
        this.inputCharacteristic = null;
        this.pinchActive = false;
        this.eventListeners = { sensors: [], gesture: [] };
    }
    async connect(onConnect, onDisconnect) {
        try {
            this.gatt = await this.bluetoothModule.connectGatt(this.address);
            this.gatt.onConnectionStateChangedEvent.add((event) => {
                if (event.state === 0) {
                    if (onDisconnect) {
                        try {
                            onDisconnect(event);
                        }
                        catch (error) {
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
                }
                catch (error) {
                    print("Error in onConnect callback:" + error);
                }
            }
        }
        catch (error) {
            print("WatchDevice: connect() failed with error:" + error);
            throw error;
        }
    }
    addEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type].push(callback);
        }
    }
    emit(type, data) {
        for (const cb of this.eventListeners[type] || []) {
            cb(data);
        }
    }
    async requestMtu() {
        try {
            await this.gatt.requestMtu(512);
        }
        catch (e) {
            print("MTU request failed, continuing with default.");
        }
    }
    parse(data) {
        const tap = (data[0] === 64) || (data[0] === 17);
        const pinchProb = data[1] / 255;
        const grav = this.floatArrayToVec3(this.bytesToFloat16Array(data.slice(2, 8)));
        const gyro = this.floatArrayToVec3(this.bytesToFloat32Array(data.slice(8)));
        this.emit("sensors", { "grav": grav, "gyro": gyro });
        if ((tap || pinchProb > 0.6) && !this.pinchActive) {
            this.pinchActive = true;
            this.emit("gesture", "pinch");
        }
        else if (pinchProb < 0.3 && this.pinchActive) {
            this.pinchActive = false;
            this.emit("gesture", "release");
        }
    }
    async discoverServices() {
        const services = this.gatt.getServices();
        const protobufService = services.find(s => s.uuid.toLowerCase() === "f9d60370-5325-4c64-b874-a68c7c555bad");
        if (!protobufService)
            throw new Error("Hax service not found");
        const characteristics = protobufService.getCharacteristics();
        this.outputCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === "f9d60380-5325-4c64-b874-a68c7c555bad");
        //this.inputCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === "f9d60372-5325-4c64-b874-a68c7c555bad");
        if (!this.outputCharacteristic)
            throw new Error("Hax characteristic not found");
        await this.outputCharacteristic.registerNotifications((value) => {
            this.parse(value);
        });
    }
    bytesToFloat32Array(arr) {
        var result = [];
        let bytes = new DataView(arr.buffer);
        for (let i = 0; i < bytes.byteLength; i += 4) {
            result.push(bytes.getFloat32(i, true));
        }
        return result;
    }
    bytesToFloat16Array(arr) {
        var result = [];
        let bytes = new DataView(arr.buffer);
        for (let i = 0; i < bytes.byteLength; i += 2) {
            result.push(bytes.getInt16(i, true) / 32767);
        }
        return result;
    }
    floatArrayToVec3(arr) {
        return new vec3(arr[0], arr[1], arr[2]);
    }
}
class WatchScanner {
    constructor(bluetoothModule, deviceName, debugLogAllDevices) {
        this.debugLogAllDevices = false;
        this.bluetoothModule = bluetoothModule;
        this.isScanning = false;
        this.deviceName = deviceName;
        this.debugLogAllDevices = debugLogAllDevices;
    }
    start(onDeviceFound) {
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
        this.bluetoothModule.startScan([scanFilter], scanSettings, (result) => {
            if (this.debugLogAllDevices) {
                print("Device found: " + result.deviceName);
            }
            if (result.deviceName === this.deviceName || (watchNameIsEmpty && result.deviceName.startsWith("DP"))) {
                print("Device found with name" + result.deviceName);
                const watchDevice = new WatchDevice(result.deviceName, result.deviceAddress, this.bluetoothModule);
                onDeviceFound(watchDevice);
            }
        });
    }
    stop() {
        if (!this.isScanning)
            return;
        this.bluetoothModule.stopScan();
        this.isScanning = false;
    }
}
let TouchSdk = class TouchSdk extends BaseScriptComponent {
    ;
    onAwake() {
        this.startScannningDevices();
    }
    startScannningDevices() {
        print("Startin scanning for devices...");
        this.scanner = new WatchScanner(this.bluetoothCentralModule, this.watchName, this.debugLogAllDevices);
        this.scanner.start((device) => {
            print(`Found device: ${device.name}`);
            this.connectToDevice(device);
        });
    }
    onConnectionFailed() {
        print("Connection failed");
        this.scanner.stop();
    }
    connectToDevice(device) {
        var onConnect = (connectedDevice) => {
            print("Connected to device:" + connectedDevice.name);
            this.onDeviceConnectedEvent.invoke(connectedDevice.name);
            this.scanner.stop();
            var currentSensorData = new SensorData();
            connectedDevice.addEventListener("sensors", (values) => {
                currentSensorData.grav = values.grav; // normalized
                currentSensorData.gyro = values.gyro;
                this.onSensorUpdateEvent.invoke(currentSensorData);
            });
            connectedDevice.addEventListener("gesture", (gesture) => {
                if (gesture === "pinch") {
                    this.onPinchStartEvent.invoke("pinch start");
                }
                else if (gesture === "release") {
                    this.onPinchReleaseEvent.invoke("pinch release");
                }
            });
        };
        var onDisconnect = (event) => {
            print("Disconnected from device:" + event);
        };
        try {
            device.connect(onConnect, onDisconnect);
        }
        catch (error) {
            print(error);
            this.onConnectionFailed();
        }
        ;
    }
    __initialize() {
        super.__initialize();
        this.onDeviceConnectedEvent = new Event_1.default();
        this.onPinchStartEvent = new Event_1.default();
        this.onPinchReleaseEvent = new Event_1.default();
        this.onSensorUpdateEvent = new Event_1.default();
        this.onDeviceConnected = this.onDeviceConnectedEvent.publicApi();
        this.onPinchStart = this.onPinchStartEvent.publicApi();
        this.onPinchRelease = this.onPinchReleaseEvent.publicApi();
        this.onSensorUpdate = this.onSensorUpdateEvent.publicApi();
    }
};
exports.TouchSdk = TouchSdk;
exports.TouchSdk = TouchSdk = __decorate([
    component
], TouchSdk);
//# sourceMappingURL=TouchSdk.js.map