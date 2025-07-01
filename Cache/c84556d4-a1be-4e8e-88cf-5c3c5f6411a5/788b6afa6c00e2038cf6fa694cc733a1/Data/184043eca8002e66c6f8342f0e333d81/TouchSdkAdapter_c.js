if (script.onAwake) {
	script.onAwake();
	return;
};
function checkUndefined(property, showIfData){
   for (var i = 0; i < showIfData.length; i++){
       if (showIfData[i][0] && script[showIfData[i][0]] != showIfData[i][1]){
           return;
       }
   }
   if (script[property] == undefined){
      throw new Error('Input ' + property + ' was not provided for the object ' + script.getSceneObject().name);
   }
}
// @input AssignableType touchSDK
// @ui {"widget":"separator"}
// @input SceneObject connectedBluetoothObj
// @input SceneObject scanningBluetoothObj
// @input Component.Text watchNameText
// @ui {"widget":"separator"}
// @input Component.Text tapCounterText
// @input Component.Text doubleTapCounterText
// @input Component.Text tripleTapCounterText
// @ui {"widget":"separator"}
// @input Component.Text pinchStateText
// @input Component.Text palmUpStateText
// @input Component.Text armUpStateText
var scriptPrototype = Object.getPrototypeOf(script);
if (!global.BaseScriptComponent){
   function BaseScriptComponent(){}
   global.BaseScriptComponent = BaseScriptComponent;
   global.BaseScriptComponent.prototype = scriptPrototype;
   global.BaseScriptComponent.prototype.__initialize = function(){};
   global.BaseScriptComponent.getTypeName = function(){
       throw new Error("Cannot get type name from the class, not decorated with @component");
   }
}
var Module = require("../../../../Modules/Src/Assets/Scripts/TouchSdkAdapter");
Object.setPrototypeOf(script, Module.TouchSdkAdapter.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("touchSDK", []);
    checkUndefined("connectedBluetoothObj", []);
    checkUndefined("scanningBluetoothObj", []);
    checkUndefined("watchNameText", []);
    checkUndefined("tapCounterText", []);
    checkUndefined("doubleTapCounterText", []);
    checkUndefined("tripleTapCounterText", []);
    checkUndefined("pinchStateText", []);
    checkUndefined("palmUpStateText", []);
    checkUndefined("armUpStateText", []);
    if (script.onAwake) {
       script.onAwake();
    }
});
