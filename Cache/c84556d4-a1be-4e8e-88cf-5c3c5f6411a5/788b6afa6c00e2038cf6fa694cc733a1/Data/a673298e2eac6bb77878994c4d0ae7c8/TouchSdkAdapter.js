"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TouchSdkAdapter = void 0;
var __selfType = requireType("./TouchSdkAdapter");
function component(target) { target.getTypeName = function () { return __selfType; }; }
let TouchSdkAdapter = class TouchSdkAdapter extends BaseScriptComponent {
    onAwake() {
        // Check if touchSDK input is provided
        if (!this.touchSDK) {
            print("ERROR: TouchSDK input is not connected to TouchSDKAdapter component!");
            print("Please connect a TouchSDK component to the touchSDK input field in the Inspector.");
            return;
        }
        this.touchSDK.onDeviceConnected.add(this.onDeviceConnected.bind(this));
        this.touchSDK.onPinchStart.add(this.onPinchStart.bind(this));
        this.touchSDK.onPinchRelease.add(this.onPinchRelease.bind(this));
        this.touchSDK.onSensorUpdate.add(this.onSensorUpdate.bind(this));
        this.tapDelayEvent = this.createEvent("DelayedCallbackEvent");
        this.tapDelayEvent.bind(this.onTapDelayEnd.bind(this));
    }
    // -- Data updates from Touch SDK --
    onDeviceConnected(watchName) {
        this.scanningBluetoothObj.enabled = false;
        this.connectedBluetoothObj.enabled = true;
        this.watchNameText.text = watchName;
    }
    onPinchRelease() {
        this.pinchStateText.text = "False";
        this.handleTap();
    }
    onPinchStart() {
        this.pinchStateText.text = "True";
    }
    onSensorUpdate(sensorData) {
        this.updateArmUpState(sensorData.grav);
        this.updatePalmUpState(sensorData.grav);
    }
    // -- Arm up state--
    updateArmUpState(normalizedGravity) {
        const gravDownCosine = normalizedGravity.x;
        if (gravDownCosine > this.ARM_UP_GRAVITY_THRESHOLD) {
            if (this.armUp) {
                this.onArmDown();
            }
        }
        else {
            if (!this.armUp) {
                this.onArmUp();
            }
        }
    }
    onArmUp() {
        this.armUp = true;
        this.armUpStateText.text = "Up";
    }
    onArmDown() {
        this.armUp = false;
        this.armUpStateText.text = "Down";
    }
    // -- Palm up state --
    updatePalmUpState(normalizedGravity) {
        const verticalCos = Math.abs(normalizedGravity.x);
        const supination = Math.abs(Math.atan2(normalizedGravity.y, normalizedGravity.z) * 180 / Math.PI);
        const palmUpValue = verticalCos < this.PALM_UP_VERTICAL_SIN && supination > this.PALM_UP_ROTATION_ANGLE_DEG;
        if (this.palmUp && palmUpValue === false) {
            this.onPalmDown();
        }
        else if (!this.palmUp && palmUpValue === true) {
            this.onPalmUp();
        }
    }
    onPalmUp() {
        this.palmUp = true;
        this.palmUpStateText.text = "Up";
    }
    onPalmDown() {
        this.palmUp = false;
        this.palmUpStateText.text = "Down";
    }
    // -- Tap logic--
    handleTap() {
        this.currentTapCount++;
        if (this.currentTapCount === 3) {
            this.onTripleTap();
            this.currentTapCount = 0;
        }
        else {
            this.tapDelayEvent.reset(this.maxTapDelay);
        }
    }
    onTapDelayEnd() {
        if (this.currentTapCount === 1) {
            this.onSingleTap();
        }
        else if (this.currentTapCount === 2) {
            this.onDoubleTap();
        }
        this.currentTapCount = 0;
    }
    onSingleTap() {
        this.singleTapCounter++;
        this.tapCounterText.text = this.singleTapCounter.toString();
    }
    onDoubleTap() {
        this.doubleTapCounter++;
        this.doubleTapCounterText.text = this.doubleTapCounter.toString();
    }
    onTripleTap() {
        this.tripleTapCounter++;
        this.tripleTapCounterText.text = this.tripleTapCounter.toString();
    }
    __initialize() {
        super.__initialize();
        this.armUp = false;
        this.palmUp = false;
        this.ARM_UP_GRAVITY_THRESHOLD = 0.3;
        this.PALM_UP_VERTICAL_SIN = 0.86;
        this.PALM_UP_ROTATION_ANGLE_DEG = 110;
        this.tapDelayEvent = null;
        this.currentTapCount = 0;
        this.maxTapDelay = 0.35;
        this.singleTapCounter = 0;
        this.doubleTapCounter = 0;
        this.tripleTapCounter = 0;
    }
};
exports.TouchSdkAdapter = TouchSdkAdapter;
exports.TouchSdkAdapter = TouchSdkAdapter = __decorate([
    component
], TouchSdkAdapter);
//# sourceMappingURL=TouchSdkAdapter.js.map