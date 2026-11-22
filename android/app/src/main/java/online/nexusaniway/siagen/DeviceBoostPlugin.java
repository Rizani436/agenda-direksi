package online.nexusaniway.siagen;

import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Agar notifikasi FCM selalu muncul: minta pengecualian baterai + buka layar autostart OEM.
// Android tidak mengizinkan app mengaktifkan sendiri tanpa sentuhan user — dialog/layar dibuka, user tinggal ketuk Izinkan.
@CapacitorPlugin(name = "DeviceBoost")
public class DeviceBoostPlugin extends Plugin {

  @PluginMethod
  public void requestIgnoreBattery(PluginCall call) {
    try {
      PowerManager pm = getContext().getSystemService(PowerManager.class);
      if (!pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
        Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(i);
      }
    } catch (Exception ignored) {}
    call.resolve();
  }

  @PluginMethod
  public void openAutostart(PluginCall call) {
    String[][] oem = {
      {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"}, // Xiaomi/MIUI
      {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"}, // Oppo/Realme
      {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"}, // Oppo lama
      {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"}, // Vivo
      {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"}, // Vivo iManager
      {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"}, // Huawei
    };
    for (String[] t : oem) {
      try {
        Intent i = new Intent().setClassName(t[0], t[1]).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(i);
        call.resolve();
        return;
      } catch (Exception ignored) {}
    }
    try { // fallback: halaman info app di Settings
      Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:" + getContext().getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(i);
    } catch (Exception ignored) {}
    call.resolve();
  }
}
