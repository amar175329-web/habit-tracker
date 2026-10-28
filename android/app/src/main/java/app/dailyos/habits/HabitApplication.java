package app.dailyos.habits;

import android.app.Application;
import android.content.SharedPreferences;
import androidx.appcompat.app.AppCompatDelegate;

public class HabitApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            SharedPreferences prefs = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE);
            String saved = prefs.getString(MainActivity.KEY_THEME, null);
            boolean isDark = "dark".equalsIgnoreCase(saved);
            if (!isDark && !"light".equalsIgnoreCase(saved)) {
                prefs.edit().putString(MainActivity.KEY_THEME, "light").commit();
            }
            AppCompatDelegate.setDefaultNightMode(
                isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO
            );
        } catch (Exception ignored) {}
    }
}
