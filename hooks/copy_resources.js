/**
 * copy_fcm_resources.js
 * Plugin hook to deal specifically with the resources for notifications (icons, sound) 
 * on the OutSystems platform. 
 *
 * @license MIT
 * @version 1.0
 * @author  João Gonçalves, joao.goncalves@outsystems.com
 * @updated 29/09/2017
 * @link    www.outsystems.com
 *
 */

module.exports = function (ctx) {
    var Q = ctx.requireCordovaModule("q"),
      fs = ctx.requireCordovaModule("fs"),
      path = ctx.requireCordovaModule("path"),
      shell = ctx.requireCordovaModule('shelljs'),
      CordovaError = ctx.requireCordovaModule("cordova-common").CordovaError,
      ConfigParser = ctx.requireCordovaModule("cordova-common").ConfigParser;
  
    var AdmZip = require("adm-zip");
  
  
    // The name of the target directory set on the Service Studio
    // This folder will be located inside those directories:
    // - Android path: platforms/android/app/src/main/assets/www
    // - iOS path: platforms/ios/www/
    Object.defineProperty(this, "RESOURCES_TARGET_FOLDER", {
      configurable: false,
      enumerable: true,
      writable: false,
      value: "icon-resources"
    });
  
    /**
     * List of target drawable directories per dimension.
     */
    var android_res_paths = {
      "ldpi": "res/mipmap-ldpi",
      "mdpi": "res/mipmap-mdpi",
      "hdpi": "res/mipmap-hdpi",
      "xhdpi": "res/mipmap-xhdpi",
      "xxhdpi": "res/mipmap-xxhdpi",
      "xxxhdpi": "res/mipmap-xxxhdpi"
    };
  
    /**
     * List of preference names per dimension
     */
    var android_preference_icon_name = {
      "ldpi": "IconLdpi",
      "mdpi": "IconMdpi",
      "hdpi": "IconHdpi",
      "xhdpi": "IconXhdpi",
      "xxhdpi": "IconXxhdpi",
      "xxxhdpi": "IconXxxhdpi"
    };

    var iconName = "";
  
  
    // TODO(jppg): Implement iOS sound file handling
    // function _handleIos(context) {
    //   var defer = Q.defer();
    //   var iosFolder = context.opts.cordova.project ? context.opts.cordova.project.root : path.join(context.opts.projectRoot, 'platforms/ios/');
    //   console.log("iOS Platform Folder: " + iosFolder);
  
    //   var promise = undefined;
    //   var projFolder = undefined;
    //   var projName = undefined;
  
    //   // Find the project folder by looking for *.xcodeproj
    //   var dirFiles = fs.readdirSync(iosFolder);
  
    //   dirFiles.forEach(function (file) {
    //     if (file.match(/\.xcodeproj$/)) {
    //       projFolder = path.join(iosFolder, file);
    //       projName = path.basename(file, '.xcodeproj');
    //     }
    //   });
  
    //   if (!projFolder || !projName) {
    //     throw new Error("Could not find an .xcodeproj folder in: " + iosFolder);
    //   }
  
    //   var configXML = path.join(iosFolder, projName, 'config.xml');
  
    //   var configParser = new ConfigParser(configXML);
  
  
    //   defer.resolve();
    //   return defer.promise;
    // }

    function addDefaultIconManifest(root){
      var manifestPath = path.join(root,"platforms","android","app","src","main","AndroidManifest.xml");
      var manifest = fs.readFileSync(manifestPath, "utf8");

      var regex = /(<\?xml[.|\s|\S]*)()(<activity[.|\s|\S]*)(<action android:name="android\.intent\.action\.MAIN" \/>)([\s|\S]*manifest>)/gm;

      manifest = manifest.replace(regex,replacer);

      fs.writeFileSync(manifestPath, manifest);

      
    }

    function replacer(match, p1, p2, p3,p4,p5, offset, string){
      var defaultIcon = getActivityAlias("DefaultIcon","ic_launcher");
      var icon = getActivityAlias(iconName.replace("_",""),iconName);
      var alias = [defaultIcon,icon].join("");
      return [p1,alias,p3,p5].join("");
    }

    function getActivityAlias(aliasName,iconName){
      var alias = '<activity-alias android:name=".'+aliasName+'" android:label="@string/launcher_name" android:icon="@mipmap/'+iconName+'"';
      if(aliasName == "DefaultIcon"){
        alias = alias +' android:enabled="true"';
      }
      alias = alias + ' android:targetActivity=".MainActivity"> <intent-filter> <action android:name="android.intent.action.MAIN" /> <category android:name="android.intent.category.LAUNCHER" /> </intent-filter> </activity-alias>';
      return alias;
    }
  
    function _handleAndroid(context) {
      var defer = Q.defer();
      var projectRoot = context.opts.cordova.project ? context.opts.cordova.project.root : context.opts.projectRoot;
  
      var androidFolder = path.join(projectRoot, 'platforms/android/app/src/main');
  
      var configXML = path.join(projectRoot, 'config.xml');
  
      var configParser = new ConfigParser(configXML);
  
      /**
       * Holds the values set on each preference per dimension.
       */
      var icon_preferences_values = {};
      /*var icon_preferences_values = {
        "mdpi": "drawable-mdpi/ic_notification.png",
        "hdpi": "drawable-hdpi/ic_notification.png",
        "xhdpi": "drawable-xhdpi/ic_notification.png",
        "xxhdpi": "drawable-xxhdpi/ic_notification.png",
        "xxxhdpi": "drawable-xxxhdpi/ic_notification.png"
      };*/
      // Retrieve preferences values
      var prefIconName = configParser.getPreference("IconName", "android");//"ic_notification";//
      var prefZipFilename = configParser.getGlobalPreference("ResourcesFile");//"icon-resources";//
      
      iconName = prefIconName;
      addDefaultIconManifest(projectRoot);

      // Read value from preferences
      for (var key in android_preference_icon_name) {
        if (android_preference_icon_name.hasOwnProperty(key)) {
          var prefName = android_preference_icon_name[key];
          var value = configParser.getPreference(prefName, "android");
          Object.defineProperty(icon_preferences_values, key, {
            enumerable: true,
            configurable: false,
            writable: false,
            value: value
          });
        }
      }
  
  
      if (!prefZipFilename) {
        console.log("Aborting resources handling. Reason: ResourcesFile preference not set.");
        defer.resolve();
        return defer;
      }
  
      var resourcesFolder = getResourcesFolder(context);
      // unzip the resources file, if any
      var zipFile = getZipFile(resourcesFolder, prefZipFilename);
  
      // if zip file is present, lets unzip it!
      if (!zipFile)  {
        console.log("Aborting resources handling. Reason: Resources zip file not found.");
        defer.resolve();
        return defer;
      }
  
      var unzipedResourcesDir = unzip(zipFile, resourcesFolder, prefZipFilename);
  
      try {
        var hasResources = fs.readdirSync(unzipedResourcesDir);
        if (!hasResources) {
          console.log("Aborting resources handling for android. Reason: No resources found or empty zip file.");
          defer.resolve();
          return defer;
        }
      } catch (err) {
        if (err.code === "ENOENT") {
          console.log("Aborting resources handling for android. Reason: No resources found.");
          defer.resolve();
          return defer;
        }
      }
  
      var handleIconsPromiseRes = handleAndroidIcons(androidFolder, prefIconName, icon_preferences_values, unzipedResourcesDir);
      handleIconsPromiseRes.then(function (resolve, reject) {

        removeDir(unzipedResourcesDir);
        removeDir(zipFile);
        
        return true;
      });
      defer.resolve(handleIconsPromiseRes);
      return defer.promise;
    }
    
    /**
     * Remove a dir and it's contents
     * 
     * @param {String} dir_path 
     */
    function removeDir(dir_path){
      if (fs.existsSync(dir_path)) {
        fs.readdirSync(dir_path).forEach(function(entry) {
            var entry_path = path.join(dir_path, entry);
            if (fs.lstatSync(entry_path).isDirectory()) {
              removeDir(entry_path);
            } else {
              fs.unlinkSync(entry_path);
            }
        });
        fs.rmdirSync(dir_path);
      }
    }
  
    /**
     * Handle Android icon resources
     * 
     * @param {String} androidFolder 
     * @param {String} prefIconName 
     * @param {String} icon_preferences_values 
     * @param {String} unzipedResourcesDir 
     */
    function handleAndroidIcons(androidFolder, prefIconName, icon_preferences_values, unzipedResourcesDir) {
      var defer = Q.defer();
      // jppg: prerequisites: prefIconName has to be set otherwise we 
      // can't copy to target directories correctly
      if (!prefIconName) {
        console.log("Aborting  resources handling for android. Reason: IconName preference value not set.");
        defer.resolve();
        return defer.promise;
      }
  
      // Android only allows for resource names that match [a-z0-9_]
      if (prefIconName.match(/[^a-z0-9_]/)) {
        defer.reject(new CordovaError("Invalid value set for IconName. The name must only match [a-z0-9_]"));
        return defer.promise;
      }
  
      // for each icon set on the preference
      // copy the file into the appropriate android res folder
  
      var copyFn = function (key) {
        var defer = Q.defer();
        if (icon_preferences_values.hasOwnProperty(key)) {
          console.log("Handling: " + key + " - " + icon_preferences_values[key] + "\n");
          // ignore preferences without value
          if (!icon_preferences_values[key]) {
            defer.resolve();
            return defer.promise;
          }
  
  
          var origIconPath = path.join(unzipedResourcesDir, icon_preferences_values[key]);
          var extension = path.extname(origIconPath);
          var iconname = path.basename(origIconPath, extension);
  
          // ignore files that aren't either png, jpg ou jpeg.
          if (!extension.match(/\.(png|jpg|jpeg)$/)) {
            defer.resolve();
            return defer.promise;
          }
          if (origIconPath) {
  
            fs.lstat(origIconPath, function (err, stat) {
              // The original file doesn't exist, ignore it!
              if (err) {
                console.log("Resources: Failed to copy '" + icon_preferences_values[key] + "' for " + android_preference_icon_name[key] + ". The file doesn't exist on the resources.\n");
                defer.resolve();
                return defer.promise;
              }
              
              console.log("Original Icon:" + origIconPath + "\n");
  
              var targetDir = path.resolve(androidFolder, android_res_paths[key]);
              var destFile = path.join(targetDir, prefIconName + extension);
  
              fs.lstat(targetDir, function (err) {
                if (err && err.code === "ENOENT") {
                  shell.mkdir("-p", targetDir);
                }
                shell.cp('-f', origIconPath, destFile);
                defer.resolve();
              });
            });
          }
  
        }
        return defer.promise;
      };
      
      var keys = Object.keys(icon_preferences_values);
      var copyPromises = keys.map(copyFn);
      var allCopiedPromise = Q.all(copyPromises);
      defer.resolve(allCopiedPromise);
      return defer.promise;
  
    }
  
    /**
     * 
     * Searches the resources folder for a zip file with the name equal 
     * to the ResourcesFile preference value and resturns an absolute path
     * if found.
     * 
     * @param {String} resourcesFolder - the absolute path to the expected resources folder
     * @param {String} prefZipFilename - the expected name of the zip file 
     *                                 as set on the ResourcesFile prefenrece
     * 
     */
    function getZipFile(resourcesFolder, prefZipFilename) {
      var dirFiles = fs.readdirSync(resourcesFolder);
      var zipFile;
      dirFiles.forEach(function (file) {
        if (file.match(/\.zip$/)) {
          var filename = path.basename(file, ".zip");
          if (filename === prefZipFilename)  {
            zipFile = path.join(resourcesFolder, file);
          }
        }
      });
      return zipFile;
    }
  
    /**
     * Attempts to open and extract a zip file
     * @param {String} zipFile - absolute path to the zip file
     * @return {String} Target directory
     */
    function unzip(zipFile, resourcesFolder, prefZipFilename) {
      var zip = new AdmZip(zipFile);
      var targetDir = path.join(resourcesFolder, prefZipFilename);
      zip.extractAllTo(targetDir, true);
      return targetDir;
    }
  
    /**
     * Returns the absolute path to the resources folder inside "www" folder.
     * Depends on the current running platform.
     * 
     * Example:
     *        - Android path: platforms/android/assets/www
     *        - iOS path: platforms/ios/www/
     * 
     * @param {String} context cordova plugin context
     * @return {String} the resources folder
     */
    function getResourcesFolder(context) {
      var platform = context.opts.plugin.platform;
      var projectRoot = context.opts.projectRoot;
      var platformPath = path.join(projectRoot, "platforms", platform);
      var wwwfolder;
      if (platform === "android") {
        wwwfolder = "app/src/main/assets/www";
      } else if (platform === "ios") {
        wwwfolder = "www";
      }
  
      if (!wwwfolder) {
        return;
      }
      return path.join(platformPath, wwwfolder, RESOURCES_TARGET_FOLDER);
  
    }
  
  
    var platform = ctx.opts.plugin.platform;
    if (platform === "android") {
      return _handleAndroid(ctx);
    }
  
    // TODO(jppg): Implement iOS sound file handling
  };
  