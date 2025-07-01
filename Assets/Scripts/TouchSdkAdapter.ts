import {TouchSdk, SensorData} from "./TouchSdk"


@component
export class TouchSdkAdapter extends BaseScriptComponent {

    @input
    touchSdk: TouchSdk

    @ui.separator

    @input
    connectedBluetoothObj: SceneObject

    @input
    scanningBluetoothObj: SceneObject

    @input
    watchNameText: Text

    @ui.separator

    @input
    tapCounterText: Text

    @input
    doubleTapCounterText: Text

    @input
    tripleTapCounterText: Text

    @ui.separator

    @input
    pinchStateText: Text

    @input
    palmUpStateText: Text
    
    @input
    armUpStateText: Text

    private armUp:boolean = false;
    private palmUp:boolean = false;
    private readonly ARM_UP_GRAVITY_THRESHOLD:number = 0.3;
    private readonly PALM_UP_VERTICAL_SIN: number = 0.86;
    private readonly PALM_UP_ROTATION_ANGLE_DEG: number = 110;

    private tapDelayEvent: DelayedCallbackEvent = null;
    private currentTapCount:number = 0;
    private maxTapDelay:number = 0.35;
    private singleTapCounter:number = 0;
    private doubleTapCounter:number = 0;
    private tripleTapCounter:number = 0;

    onAwake() {
        this.touchSdk.onDeviceConnected.add(this.onDeviceConnected.bind(this))
        this.touchSdk.onPinchStart.add(this.onPinchStart.bind(this))
        this.touchSdk.onPinchRelease.add(this.onPinchRelease.bind(this))
        this.touchSdk.onSensorUpdate.add(this.onSensorUpdate.bind(this))

        this.tapDelayEvent = this.createEvent("DelayedCallbackEvent");
        this.tapDelayEvent.bind(this.onTapDelayEnd.bind(this));
    }

    // -- Data updates from Touch sdk --

    private onDeviceConnected(watchName:string){
        this.scanningBluetoothObj.enabled = false;
        this.connectedBluetoothObj.enabled = true;
        this.watchNameText.text = watchName;
    }

    private onPinchRelease(){
        this.pinchStateText.text = "False"
        this.handleTap();
    }

    private onPinchStart(){
        this.pinchStateText.text = "True"
    }

    private onSensorUpdate(sensorData: SensorData){
        this.updateArmUpState(sensorData.grav);
        this.updatePalmUpState(sensorData.grav);
    }

    // -- Arm up state--

    private updateArmUpState(normalizedGravity: vec3) {
        const gravDownCosine = normalizedGravity.x;
        if (gravDownCosine > this.ARM_UP_GRAVITY_THRESHOLD) {
            if (this.armUp) {
                this.onArmDown();
            }
        } else {
            if (!this.armUp) {
                this.onArmUp();
            }
        }
    }

    private onArmUp(){
        this.armUp = true;
        this.armUpStateText.text = "Up";
    }

    private onArmDown(){
        this.armUp = false;
        this.armUpStateText.text = "Down";
    }

    // -- Palm up state --

    private updatePalmUpState(normalizedGravity: vec3) {
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

    private onPalmUp(){
        this.palmUp = true;
        this.palmUpStateText.text = "Up";
    }

    private onPalmDown(){
        this.palmUp = false;
        this.palmUpStateText.text = "Down";
    }

    // -- Tap logic--
    private handleTap() {
        this.currentTapCount++;

        if(this.currentTapCount === 3){
            this.onTripleTap();
            this.currentTapCount = 0;
        }
        else{
            this.tapDelayEvent.reset(this.maxTapDelay);
        }
    }

    private onTapDelayEnd() {
        if (this.currentTapCount === 1) {
            this.onSingleTap();
        } else if (this.currentTapCount === 2) {
            this.onDoubleTap();
        }
        this.currentTapCount = 0;
    }

    private onSingleTap(){
        this.singleTapCounter++;
        this.tapCounterText.text = this.singleTapCounter.toString();
    }

    private onDoubleTap(){
        this.doubleTapCounter++;
        this.doubleTapCounterText.text = this.doubleTapCounter.toString();
    }

    private onTripleTap(){
        this.tripleTapCounter++;
        this.tripleTapCounterText.text = this.tripleTapCounter.toString();
    }

}
