package app.dailyos.habits;

import android.app.Application;
import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;

public class HabitApplication extends Application {

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        applyInitialNightMode(base);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        applyInitialNightMode(this);
    }

    public static void applyInitialNightMode(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
            String saved = prefs.getString(MainActivity.KEY_THEME, null);
            if (saved == null) {
                saved = prefs.getString("dailyos_theme", null);
            }
            boolean isDark = "dark".equalsIgnoreCase(saved);
            if (!isDark && !"light".equalsIgnoreCase(saved)) {
                // Fresh install / nothing saved: force default to LIGHT
                prefs.edit().putString(MainActivity.KEY_THEME, "light").putString("dailyos_theme", "light").commit();
                isDark = false;
            }

            int mode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
            AppCompatDelegate.setDefaultNightMode(mode);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    UiModeManager uim = (UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
                    if (uim != null) {
                        int targetMode = isDark ? UiModeManager.MODE_NIGHT_YES : UiModeManager.MODE_NIGHT_NO;
                        uim.setApplicationNightMode(targetMode);
                    }
                } catch (Throwable ignored) {}
            }
        } catch (Throwable ignored) {}
    }
}
