package org.apache.cordova.appiconchanger;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;


public class AppIconChanger extends CordovaPlugin {
    Activity activity;
    List<String> disableNames = new ArrayList<>();

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        // activity value must be set, for some reason cannot be set in the global variable declaration
        activity = cordova.getActivity();

        if ("isSupported".equals(action)) {
            callbackContext.success();
            return true;
        } else if ("changeIcon".equals(action)) {
            String activeName;

            JSONObject argList = args.getJSONObject(0);
            String iconName = argList.getString("iconName");
            Boolean suppressUserNotification = argList.getBoolean("suppressUserNotification");

            // get the list of activities that need to be disabled
            this.getRunningActivity(activity);

            StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.append(activity.getPackageName());
            stringBuilder.append("." + iconName);
            //stringBuilder.append(iconName);

            activeName = stringBuilder.toString();

            this.setAppIcon(activeName, disableNames);

            if (!suppressUserNotification) {
                this.iconChangeDialog(iconName);
            }

            callbackContext.success();
            return true;
        } else {
            callbackContext.error(action + " is not a supported action");
            return false;  // Returning false results in a "MethodNotFound" error.
        }
    }

    public void getRunningActivity(Context context) {
        try {
            String activityName;
            String shortActivityName;

            PackageInfo pi = context.getPackageManager().getPackageInfo(
                    context.getPackageName(), PackageManager.GET_ACTIVITIES);

            for (int i = 0; i < pi.activities.length; i++) {
                activityName = pi.activities[i].name;
                shortActivityName = activityName.replace(activity.getPackageName() + ".", "");

                if (!shortActivityName.equals(activity.getClass().getSimpleName())) {
                    disableNames.add(activityName);
                }
            }

        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
            Log.e("ERROR", "Could not get running activity list");
        }
    }

    public void setAppIcon(String activeName, List<String> disableNames) {
        new AppIconNameChanger.Builder(activity)
            .activeName(activeName) // String
            .disableNames(disableNames) // List<String>
            .packageName(activity.getPackageName())
            .build()
            .setNow();
    }

    public void iconChangeDialog(String iconName) {
        AlertDialog.Builder builder = new AlertDialog.Builder(activity);

        //Resources activityRes = cordova.getActivity().getResources();
        Resources activityRes = activity.getResources();

        // get the resource IDs for all elements used from main cordova app (Ex. R.layout.appiconchanger) to get around importing the mainActivity class
        int appiconchangerResId = activityRes.getIdentifier("appiconchanger", "layout", activity.getPackageName());
        int appIconTextResId = activityRes.getIdentifier("appIconChangerDialog_appIconText", "id", activity.getPackageName());
        int appIconResId = activityRes.getIdentifier("appIconChangerDialog_appIcon", "id", activity.getPackageName());
        int appIconButtonResId = activityRes.getIdentifier("appIconChangerDialog_appIconButton", "id", activity.getPackageName());
        int ic_launcherResId = activityRes.getIdentifier("ic_launcher", "mipmap", activity.getPackageName());
        int app_nameResId = activityRes.getIdentifier("app_name", "string", activity.getPackageName());
        int default_icon_idResId = activityRes.getIdentifier("default_icon_id", "string", activity.getPackageName());

        String defaultIconID = activityRes.getString(default_icon_idResId);

        LayoutInflater factory = LayoutInflater.from(activity);
        View view = factory.inflate(appiconchangerResId, null);

        TextView appIconText = view.findViewById(appIconTextResId);
        ImageView appIcon = view.findViewById(appIconResId);
        Button appIconButton = view.findViewById(appIconButtonResId);

        // Set the Icon for the Dialog
        if (iconName.equals(defaultIconID)) {
            appIcon.setImageResource(ic_launcherResId);
        } else {
            // get the id of the icon
            int drawableID = activity.getResources().getIdentifier(iconName, "mipmap", activity.getPackageName());
            appIcon.setImageResource(drawableID);
        }

        appIconText.setText("You have changed the icon for \"" + activity.getResources().getString(app_nameResId) + "\".");

        final AlertDialog alertDialog = builder.create();

        appIconButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                // Do something in response to button click
                alertDialog.dismiss();
            }
        });

        alertDialog.setView(view);
        alertDialog.setCancelable(false);
        alertDialog.show();
    }
}