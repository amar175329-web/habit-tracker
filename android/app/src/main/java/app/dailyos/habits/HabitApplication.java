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
            String savedTheme = prefs.getString(MainActivity.KEY_THEME, "light");
            if ("dark".equalsIgnoreCase(savedTheme)) {
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
            } else {
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
            }
        } catch (Exception ignored) {}
    }
}
