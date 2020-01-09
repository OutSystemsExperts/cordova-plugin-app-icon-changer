package org.apache.cordova.appiconchanger;

import android.app.Activity;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.util.Log;

import java.util.List;


public class AppIconNameChanger {

    private Activity activity;
    List<String> disableNames;
    String activeName;
    String packageName;

    public AppIconNameChanger(Builder builder) {

        this.disableNames = builder.disableNames;
        this.activity = builder.activity;
        this.activeName = builder.activeName;
        this.packageName = builder.packageName;

    }

    public static class Builder {

        private Activity activity;
        List<String> disableNames;
        String activeName;
        String packageName;

        public Builder(Activity activity) {
            this.activity = activity;
        }

        public Builder disableNames(List<String> disableNamesl) {
            this.disableNames = disableNamesl;
            return this;
        }

        public Builder activeName(String activeName) {
            this.activeName = activeName;
            return this;
        }

        public Builder packageName(String packageName) {
            this.packageName = packageName;
            return this;
        }

        public AppIconNameChanger build() {
            return new AppIconNameChanger(this);
        }

    }

    public void setNow() {
        // disable old icon
        for (int i = 0; i < disableNames.size(); i++) {
            try {
                // run getComponentEnabledSetting to make sure activity-alias exists
                activity.getPackageManager().getComponentEnabledSetting(new ComponentName(packageName, disableNames.get(i)));

                activity.getPackageManager().setComponentEnabledSetting(
                        new ComponentName(packageName, disableNames.get(i)),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // enable new icon
        try {
            if (activity.getPackageManager().getComponentEnabledSetting(new ComponentName(packageName, activeName)) != PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                activity.getPackageManager().setComponentEnabledSetting(
                        new ComponentName(packageName, activeName),
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            }

        } catch (Exception unused) {
            Log.e("ERROR", "Could not find icon, will try to set default");

            Resources activityRes = activity.getResources();
            int default_icon_idResId = activityRes.getIdentifier("ic_launcher", "mipmap", activity.getPackageName());
            String defaultIconID = activityRes.getString(default_icon_idResId);

            StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.append(packageName);
            //stringBuilder.append("." + activity.getClass().getSimpleName() + "_default");
            stringBuilder.append("." + "DefaultIcon");
            activeName = stringBuilder.toString();

            try {
                activity.getPackageManager().setComponentEnabledSetting(
                        new ComponentName(packageName, activeName),
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            } catch (Exception e2) {
                e2.getStackTrace();
            }
        }
    }
    /*
    public void addShortcut(String iconName) {
        Class mainActivity;
        Context context = activity.getApplicationContext();
        String  packageName = context.getPackageName();
        Intent  launchIntent = context.getPackageManager().getLaunchIntentForPackage(packageName);
        String  className = launchIntent.getComponent().getClassName();
        //String  className = packageName + "." + activity.getClass().getSimpleName();

        int iconID;

        iconName = iconName.replace(activity.getClass().getSimpleName() + "_", "");

        try {
            //loading the Main Activity to not import it in the plugin
            mainActivity = Class.forName(className);

            Intent shortcutIntent = new Intent(activity.getApplicationContext(), mainActivity);
            shortcutIntent.setAction(Intent.ACTION_MAIN);

            Resources activityRes = activity.getResources();

            // get the id of the icon
            if (iconName.equals(activity.getClass().getSimpleName() + "_default")) {
                iconID = activityRes.getIdentifier("ic_launcher", "mipmap", activity.getPackageName());
            } else {
                iconID = activity.getResources().getIdentifier(iconName, "drawable", activity.getPackageName());
            }

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { // code for adding shortcut on pre oreo device
                Intent addIntent = new Intent("com.android.launcher.action.INSTALL_SHORTCUT");
                addIntent.putExtra(Intent.EXTRA_SHORTCUT_INTENT, shortcutIntent);
                addIntent.putExtra(Intent.EXTRA_SHORTCUT_NAME, "customizeScreenLayout");
                addIntent.putExtra(Intent.EXTRA_SHORTCUT_ICON_RESOURCE, Intent.ShortcutIconResource.fromContext(activity.getApplicationContext(), iconID));
                addIntent.putExtra("duplicate", false);  //may it's already there so don't duplicate
                activity.getApplicationContext().sendBroadcast(addIntent);
            } else {
                ShortcutManager shortcutManager = activity.getSystemService(ShortcutManager.class);
                assert shortcutManager != null;
                if (shortcutManager.isRequestPinShortcutSupported()) {
                    ShortcutInfo pinShortcutInfo =
                            new ShortcutInfo.Builder(activity, "browser-shortcut-")
                                    .setIntent(shortcutIntent)
                                    .setIcon(Icon.createWithResource(activity, iconID))
                                    .setShortLabel("title")
                                    .build();

                    shortcutManager.requestPinShortcut(pinShortcutInfo, null);
                    System.out.println("added_to_homescreen");
                } else {
                    System.out.println("failed_to_add");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    */
}