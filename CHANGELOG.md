# Changelog

All notable changes to the project will be noted here.


## [1.0.1] - 2025-08-08
- Updated readme with description of gestures detected
- Added changelog file

## [1.0.0] - 2025-07-01

### Added
- Initial release of Touch SDK Lens Studio Example
- **Bluetooth Integration**: DPK connecting to Spectacles using BLE connection
- **Gesture Recognition**: Gesture detection examples:
  - Pinch, tap, double tap, triple tap
  - Arm up, palm up
- **Sensor Data Processing**: Real-time sensor data:
  - Gravity sensor 
  - Gyroscope 


### Dependencies
- Lens Studio v5.10.1.25061003
- Doublepoint DPK with firmware version `snap.1`
- Model: `26D + 1`

### Known Issues
- Bluetooth connection may require manual acceptance on DPK device (press Y)
- Experimental API must be enabled in project settings for Bluetooth functionality
