package app.dailyos.habits;

import android.app.Application;
import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;

public class HabitApplication extends Application {

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(configureBaseContext(base));
    }

    private Context configureBaseContext(Context base) {
        try {
            SharedPreferences prefs = base.getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
            String saved = prefs.getString(MainActivity.KEY_THEME, null);
            if (saved == null) {
                saved = prefs.getString("dailyos_theme", null);
            }
            boolean isDark = "dark".equalsIgnoreCase(saved);
            if (!isDark && !"light".equalsIgnoreCase(saved)) {
                prefs.edit().putString(MainActivity.KEY_THEME, "light").putString("dailyos_theme", "light").commit();
                isDark = false;
            }

            // Force AppCompat default night mode synchronously before super.onCreate/super.attachBaseContext
            int mode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
            AppCompatDelegate.setDefaultNightMode(mode);

            // Create context with explicit uiMode so resource resolution matches app theme immediately
            Configuration config = new Configuration(base.getResources().getConfiguration());
            config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) |
                (isDark ? Configuration.UI_MODE_NIGHT_YES : Configuration.UI_MODE_NIGHT_NO);

            return base.createConfigurationContext(config);
        } catch (Exception e) {
            return base;
        }
    }

    @Override
    public void onCreate() {
        try {
            SharedPreferences prefs = getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
            String saved = prefs.getString(MainActivity.KEY_THEME, null);
            if (saved == null) {
                saved = prefs.getString("dailyos_theme", null);
            }
            boolean isDark = "dark".equalsIgnoreCase(saved);
            if (!isDark && !"light".equalsIgnoreCase(saved)) {
                prefs.edit().putString(MainActivity.KEY_THEME, "light").putString("dailyos_theme", "light").commit();
                isDark = false;
            }

            int mode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
            AppCompatDelegate.setDefaultNightMode(mode);

            // Sync per-app night mode with Android OS on Android 13+ (API 33+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                try {
                    UiModeManager uim = getSystemService(UiModeManager.class);
                    if (uim != null) {
                        int targetMode = isDark ? UiModeManager.MODE_NIGHT_YES : UiModeManager.MODE_NIGHT_NO;
                        uim.setApplicationNightMode(targetMode);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        super.onCreate();
    }
}
