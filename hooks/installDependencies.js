module.exports = function (context) {
  
  function isCordovaAbove(context, version) {
    var cordovaVersion = context.opts.cordova.version;
    console.log(cordovaVersion);
    var sp = cordovaVersion.split('.');
    return parseInt(sp[0]) >= version;
  }

  var cordovaAbove8 = isCordovaAbove(context, 8);
  var child_process;
  var deferral;
  
  if (cordovaAbove8) {
    child_process = require('child_process');
    deferral = require('q').defer();
  } else {
    child_process = context.requireCordovaModule('child_process');
    deferral = context.requireCordovaModule('q').defer();
  }

  var output = child_process.exec('npm install', {cwd: __dirname}, function (error) {
    if (error !== null) {
      console.log('exec error: ' + error);
      deferral.reject('npm installation failed');
    }
    else {
      deferral.resolve();
    }
  });
  

  return deferral.promise;
};
