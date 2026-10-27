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
            themePollHandler.postDelayed(this, 400);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String initialTheme = prefs.getString(KEY_THEME, "light");

        applyTheme(initialTheme);
        setupThemeBridge();

        View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
            decor.post(() -> applyTheme(getSavedTheme()));
            decor.postDelayed(() -> applyTheme(getSavedTheme()), 150);
            decor.postDelayed(() -> applyTheme(getSavedTheme()), 450);
            decor.postDelayed(() -> applyTheme(getSavedTheme()), 1000);
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

            // Always load latest bundled assets and eradicate stale WebView caches
            webView.clearCache(true);
            webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);

            // Disable long click and contextual copy/share popups across WebView
            webView.setLongClickable(false);
            webView.setOnLongClickListener(v -> true);
            webView.setHapticFeedbackEnabled(false);

            // Expose AndroidTheme interface to JavaScript
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
            try {
                webView.evaluateJavascript(
                    "(function() { return (document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark' || localStorage.getItem('dailyos_theme') === 'dark') ? 'dark' : 'light'; })()",
                    value -> {
                        if (value != null && !value.equals("null")) {
                            String theme = value.replace("\"", "").trim();
                            if ("dark".equalsIgnoreCase(theme) || "light".equalsIgnoreCase(theme)) {
                                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                String current = prefs.getString(KEY_THEME, "");
                                if (!theme.equalsIgnoreCase(current)) {
                                    saveAndApplyTheme(theme);
                                }
                            }
                        }
                    }
                );
            } catch (Exception ignored) {}
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

                // Fallback for OEM skins (Infinix XOS, Transsion, Xiaomi, Samsung)
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
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(barColor);
            }
        });
    }
}

