package app.dailyos.habits;

import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ActionMode;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.splashscreen.SplashScreen;
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

    private volatile boolean isWebReady = false;
    private boolean themeInterfaceRegistered = false;

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
                activity.onWebRenderComplete();
            }
            call.resolve();
        }
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(newBase);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !isWebReady);

        // Fallback safety timeout (3500ms) in case web view fails to report readiness
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            isWebReady = true;
        }, 3500);

        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        // Enforce saved theme & night mode sync before any visual initialization
        HabitApplication.applyInitialNightMode(this);

        boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());
        configureWindowBars(isDark);
        setupThemeBridge();
    }

    @Override
    protected void load() {
        boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());
        int appBgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

        try {
            ViewGroup content = findViewById(android.R.id.content);
            if (content != null) {
                content.setBackgroundColor(appBgColor);
            }
            WebView wv = findViewById(com.getcapacitor.android.R.id.webview);
            if (wv != null) {
                wv.setBackgroundColor(appBgColor);
                if (wv.getParent() instanceof View) {
                    ((View) wv.getParent()).setBackgroundColor(appBgColor);
                }
                registerThemeInterface(wv);
            }
        } catch (Exception ignored) {}

        super.load();
        setupThemeBridge();
    }

    public void onWebRenderComplete() {
        runOnUiThread(() -> {
            isWebReady = true;
        });
    }

    private void configureWindowBars(boolean isDark) {
        int color = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
        Window window = getWindow();
        if (window == null) return;

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        window.setStatusBarColor(color);
        window.setNavigationBarColor(color);
        window.setBackgroundDrawable(new ColorDrawable(color));

        View decor = window.getDecorView();
        if (decor != null) {
            decor.setBackgroundColor(color);
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

    public String getSavedTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, null);
        if (saved == null) {
            saved = prefs.getString("dailyos_theme", null);
        }
        return "dark".equalsIgnoreCase(saved) ? "dark" : "light";
    }

    public void saveAndApplyTheme(String theme) {
        if (theme == null) return;
        final String t = "dark".equalsIgnoreCase(theme.trim()) ? "dark" : "light";
        final boolean isDark = "dark".equals(t);

        // 1. Commit immediately to SharedPreferences
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, t).putString("dailyos_theme", t).commit();

        // 2. Synchronous night mode updates
        int nightMode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
        try {
            AppCompatDelegate.setDefaultNightMode(nightMode);
            getDelegate().setLocalNightMode(nightMode);
        } catch (Exception ignored) {}

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                UiModeManager uim = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                if (uim != null) {
                    int targetMode = isDark ? UiModeManager.MODE_NIGHT_YES : UiModeManager.MODE_NIGHT_NO;
                    uim.setApplicationNightMode(targetMode);
                }
            } catch (Exception ignored) {}
        }

        // 3. UI bar and webview color sync
        runOnUiThread(() -> {
            applyTheme(t);
        });
    }

    public void applyTheme(final String theme) {
        runOnUiThread(() -> {
            boolean isDark = "dark".equalsIgnoreCase(theme);
            int color = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
            int styleRes = R.style.AppTheme_NoActionBar;

            configureWindowBars(isDark);

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(color);
                if (bridge.getWebView().getParent() instanceof View) {
                    ((View) bridge.getWebView().getParent()).setBackgroundColor(color);
                }
            }

            try {
                super.setTheme(styleRes);
                getTheme().applyStyle(styleRes, true);
                if (getApplication() != null && getApplication().getTheme() != null) {
                    getApplication().setTheme(styleRes);
                    getApplication().getTheme().applyStyle(styleRes, true);
                }
            } catch (Exception ignored) {}
        });
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
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyTheme(getSavedTheme());
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
        if (webView == null || themeInterfaceRegistered) return;
        themeInterfaceRegistered = true;
        webView.setLongClickable(false);
        webView.setOnLongClickListener(v -> true);
        webView.setHapticFeedbackEnabled(false);

        try {
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getTheme() {
                    return getSavedTheme();
                }

                @JavascriptInterface
                public void setTheme(final String theme) {
                    saveAndApplyTheme(theme);
                }

                @JavascriptInterface
                public void onAppReady() {
                    onWebRenderComplete();
                }
            }, "AndroidTheme");
        } catch (Exception ignored) {}
    }

    private void setupThemeBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView wv = bridge.getWebView();
            boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());
            int appBgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
            try {
                wv.setBackgroundColor(appBgColor);
                if (wv.getParent() instanceof View) {
                    ((View) wv.getParent()).setBackgroundColor(appBgColor);
                }
            } catch (Exception ignored) {}
            registerThemeInterface(wv);
        }
    }
}
