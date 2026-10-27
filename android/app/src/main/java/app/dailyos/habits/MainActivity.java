package app.dailyos.habits;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ActionMode;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    public static final String PREFS_NAME = "dailyos_theme_prefs";
    public static final String KEY_THEME = "dailyos_saved_theme";

    @CapacitorPlugin(name = "AppTheme")
    public static class AppThemePlugin extends Plugin {
        @PluginMethod
        public void setTheme(PluginCall call) {
            String theme = call.getString("theme", "light");
            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.saveAndApplyTheme(theme);
            }
            call.resolve();
        }
    }

    private final Handler themePollHandler = new Handler(Looper.getMainLooper());
    private final Runnable themePollRunnable = new Runnable() {
        @Override
        public void run() {
            syncThemeFromWeb();
            themePollHandler.postDelayed(this, 300);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String initialTheme = prefs.getString(KEY_THEME, "light");

        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(
            "dark".equalsIgnoreCase(initialTheme) ? androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES : androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
        );

        applyTheme(initialTheme);
        setupThemeBridge();

        View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
            decor.post(() -> applyTheme(getSavedTheme()));
            decor.postDelayed(() -> applyTheme(getSavedTheme()), 100);
            decor.postDelayed(() -> applyTheme(getSavedTheme()), 300);
            decor.postDelayed(() -> syncThemeFromWeb(), 500);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
        themePollHandler.removeCallbacks(themePollRunnable);
        themePollHandler.post(themePollRunnable);
    }

    @Override
    public void onResume() {
        super.onResume();
        setupThemeBridge();
        applyTheme(getSavedTheme());
        themePollHandler.removeCallbacks(themePollRunnable);
        themePollHandler.post(themePollRunnable);
        syncThemeFromWeb();
    }

    @Override
    public void onPause() {
        super.onPause();
        themePollHandler.removeCallbacks(themePollRunnable);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        themePollHandler.removeCallbacks(themePollRunnable);
    }

    public String getSavedTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        return prefs.getString(KEY_THEME, "light");
    }

    public void saveAndApplyTheme(String theme) {
        if (theme == null) return;
        String t = theme.toLowerCase().trim();
        if (!"dark".equals(t) && !"light".equals(t)) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, t).apply();
        applyTheme(t);
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(
            "dark".equalsIgnoreCase(t) ? androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES : androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
        );
    }

    // Suppress floating text selection action modes ("Copy | Select all | Share") window-wide
    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback, int type) {
        return null;
    }

    private void setupThemeBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            final WebView webView = bridge.getWebView();

            webView.clearCache(true);
            webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);

            webView.setLongClickable(false);
            webView.setOnLongClickListener(v -> true);
            webView.setHapticFeedbackEnabled(false);

            try {
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setTheme(final String theme) {
                        saveAndApplyTheme(theme);
                    }
                }, "AndroidTheme");
            } catch (Exception ignored) {}

            syncThemeFromWeb();
        }
    }

    private void syncThemeFromWeb() {
        if (bridge != null && bridge.getWebView() != null) {
            final WebView webView = bridge.getWebView();
            webView.post(() -> {
                try {
                    webView.evaluateJavascript(
                        "(function() { try { var d = document.documentElement; if (d.classList.contains('dark') || d.getAttribute('data-theme') === 'dark' || localStorage.getItem('dailyos_theme') === 'dark') return 'dark'; if (d.classList.contains('light') || d.getAttribute('data-theme') === 'light' || localStorage.getItem('dailyos_theme') === 'light') return 'light'; } catch(e){} return 'light'; })()",
                        value -> {
                            if (value != null && !value.equals("null")) {
                                String theme = value.replace("\"", "").replace("'", "").trim().toLowerCase();
                                if ("dark".equals(theme) || "light".equals(theme)) {
                                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                    String current = prefs.getString(KEY_THEME, "");
                                    if (!theme.equals(current)) {
                                        prefs.edit().putString(KEY_THEME, theme).apply();
                                        applyTheme(theme);
                                    }
                                }
                            }
                        }
                    );
                } catch (Exception ignored) {}
            });
        }
    }

    public void applyTheme(final String theme) {
        runOnUiThread(() -> {
            boolean isDark = "dark".equalsIgnoreCase(theme);
            // White Theme: #F2F6F5 background with dark icons/text
            // Black Theme: #0B1112 background with white icons/text
            int barColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

            Window window = getWindow();
            if (window == null) return;

            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }

            window.setStatusBarColor(barColor);
            window.setNavigationBarColor(barColor);
            window.setBackgroundDrawable(new ColorDrawable(barColor));

            View decor = window.getDecorView();
            if (decor != null) {
                decor.setBackgroundColor(barColor);
                try {
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
                    if (controller != null) {
                        // Light theme: dark icons on status bar and navigation bar (appearanceLight = true)
                        // Dark theme: white/light icons on status bar and navigation bar (appearanceLight = false)
                        controller.setAppearanceLightStatusBars(!isDark);
                        controller.setAppearanceLightNavigationBars(!isDark);
                    }
                } catch (Exception ignored) {}

                try {
                    int flags = decor.getSystemUiVisibility();
                    if (isDark) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        }
                    } else {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        }
                    }
                    decor.setSystemUiVisibility(flags);
                    decor.invalidate();
                } catch (Exception ignored) {}
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(barColor);
            }
        });
    }

    @Override
    public void onConfigurationChanged(android.content.res.Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyTheme(getSavedTheme());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyTheme(getSavedTheme());
        }
    }
}

