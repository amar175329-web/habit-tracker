package app.dailyos.habits;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatDelegate;
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

        @PluginMethod
        public void onAppReady(PluginCall call) {
            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.applyTheme(activity.getSavedTheme());
            }
            call.resolve();
        }
    }

    @Override
    protected void load() {
        try {
            WebView wv = findViewById(com.getcapacitor.android.R.id.webview);
            if (wv != null) {
                registerThemeInterface(wv);
            }
        } catch (Exception ignored) {}
        super.load();
        setupThemeBridge();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String initialTheme = prefs.getString(KEY_THEME, "light");
        if (initialTheme == null || (!"dark".equals(initialTheme) && !"light".equals(initialTheme))) {
            initialTheme = "light";
        }
        boolean isDark = "dark".equalsIgnoreCase(initialTheme);
        // Plain app background color: #F2F6F5 for light theme, #0B1112 for dark theme
        int bgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

        int targetTheme = isDark
            ? R.style.AppTheme_NoActionBar_Dark
            : R.style.AppTheme_NoActionBar;

        setTheme(targetTheme);
        try {
            getTheme().applyStyle(targetTheme, true);
        } catch (Exception ignored) {}

        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                getSplashScreen().setSplashScreenTheme(
                    isDark
                        ? R.style.AppTheme_NoActionBarLaunch_Dark
                        : R.style.AppTheme_NoActionBarLaunch_Light
                );
            } catch (Exception ignored) {}
        }

        // Override BridgeActivity's hardcoded setTheme if dark
        if (isDark) {
            setTheme(targetTheme);
            try {
                getTheme().applyStyle(targetTheme, true);
                if (getApplication() != null && getApplication().getTheme() != null) {
                    getApplication().setTheme(targetTheme);
                    getApplication().getTheme().applyStyle(targetTheme, true);
                }
            } catch (Exception ignored) {}
        }

        // Configure native window backgrounds and system bars immediately with NO splash overlay
        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }

            window.setBackgroundDrawable(new ColorDrawable(bgColor));
            window.setStatusBarColor(bgColor);
            window.setNavigationBarColor(bgColor);

            View decor = window.getDecorView();
            if (decor != null) {
                decor.setBackgroundColor(bgColor);
                try {
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
                    if (controller != null) {
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
                } catch (Exception ignored) {}
            }
        }

        setupThemeBridge();
        applyTheme(initialTheme);
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
        applyTheme(getSavedTheme());
    }

    @Override
    public void onResume() {
        super.onResume();
        setupThemeBridge();
        applyTheme(getSavedTheme());
        syncThemeFromWeb();
    }

    public String getSavedTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, "light");
        return "dark".equalsIgnoreCase(saved) ? "dark" : "light";
    }

    public void saveAndApplyTheme(String theme) {
        if (theme == null) return;
        String t = theme.toLowerCase().trim();
        if (!"dark".equals(t) && !"light".equals(t)) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, t).apply();
        try {
            AppCompatDelegate.setDefaultNightMode(
                "dark".equals(t) ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO
            );
        } catch (Exception ignored) {}
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                getSplashScreen().setSplashScreenTheme(
                    "dark".equals(t)
                        ? R.style.AppTheme_NoActionBarLaunch_Dark
                        : R.style.AppTheme_NoActionBarLaunch_Light
                );
            } catch (Exception ignored) {}
        }
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

    private void registerThemeInterface(WebView webView) {
        if (webView == null) return;
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

                @JavascriptInterface
                public void onAppReady() {
                    applyTheme(getSavedTheme());
                }
            }, "AndroidTheme");
        } catch (Exception ignored) {}
    }

    private void setupThemeBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            registerThemeInterface(bridge.getWebView());
        }
    }

    private void syncThemeFromWeb() {
        if (bridge != null && bridge.getWebView() != null) {
            final WebView webView = bridge.getWebView();
            webView.post(() -> {
                try {
                    webView.evaluateJavascript(
                        "(function() { try { var s = localStorage.getItem('dailyos_theme'); if (s === 'dark') return 'dark'; return 'light'; } catch(e){} return 'light'; })()",
                        value -> {
                            if (value != null && !value.equals("null")) {
                                String theme = value.replace("\"", "").replace("'", "").trim().toLowerCase();
                                if ("dark".equals(theme) || "light".equals(theme)) {
                                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                    String current = prefs.getString(KEY_THEME, "");
                                    if (!theme.equals(current)) {
                                        prefs.edit().putString(KEY_THEME, theme).apply();
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                            try {
                                                getSplashScreen().setSplashScreenTheme(
                                                    "dark".equals(theme)
                                                        ? R.style.AppTheme_NoActionBarLaunch_Dark
                                                        : R.style.AppTheme_NoActionBarLaunch_Light
                                                );
                                            } catch (Exception ignored) {}
                                        }
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
            // Light Theme: #F2F6F5 background with dark charcoal icons
            // Dark Theme: #0B1112 background with crisp white icons
            int barColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
            int styleRes = isDark ? R.style.AppTheme_NoActionBar_Dark : R.style.AppTheme_NoActionBar;

            // 1. FAST PATH (VSYNC Frame 0): Apply native window colors & system bar icons IMMEDIATELY
            Window window = getWindow();
            if (window != null) {
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
                    setHierarchyBackgroundColor(decor, barColor);
                    try {
                        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
                        if (controller != null) {
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
                        decor.postInvalidateOnAnimation();
                    } catch (Exception ignored) {}
                }

                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().setBackgroundColor(barColor);
                }
            }

            // 2. BACKGROUND PATH: Update styles & synchronize SystemBars plugin
            try {
                setTheme(styleRes);
                getTheme().applyStyle(styleRes, true);
                if (getApplication() != null && getApplication().getTheme() != null) {
                    getApplication().setTheme(styleRes);
                    getApplication().getTheme().applyStyle(styleRes, true);
                }
            } catch (Exception ignored) {}

            try {
                if (bridge != null) {
                    com.getcapacitor.PluginHandle handle = bridge.getPlugin("SystemBars");
                    if (handle != null && handle.getInstance() != null) {
                        Object sysBars = handle.getInstance();
                        java.lang.reflect.Method m = sysBars.getClass().getDeclaredMethod("setStyle", String.class, String.class);
                        m.setAccessible(true);
                        m.invoke(sysBars, isDark ? "DARK" : "LIGHT", "");
                    }
                }
            } catch (Exception ignored) {}
        });
    }

    private void setHierarchyBackgroundColor(View view, int color) {
        if (view == null) return;
        try {
            view.setBackgroundColor(color);
            if (view instanceof androidx.coordinatorlayout.widget.CoordinatorLayout) {
                ((androidx.coordinatorlayout.widget.CoordinatorLayout) view).setStatusBarBackgroundColor(color);
            }
            view.invalidate();
        } catch (Exception ignored) {}
        if (view instanceof android.view.ViewGroup && !(view instanceof WebView)) {
            android.view.ViewGroup group = (android.view.ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                setHierarchyBackgroundColor(group.getChildAt(i), color);
            }
        }
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
