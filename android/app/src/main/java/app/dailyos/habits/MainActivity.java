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
import android.util.DisplayMetrics;
import android.view.ActionMode;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
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

    private View splashOverlay = null;
    private ImageView splashLogoView = null;
    private boolean splashDismissed = false;
    private boolean splashDismissScheduled = false;
    private boolean isWebReady = false;
    private boolean themeInterfaceRegistered = false;
    private long launchStartTime = 0;

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
        Context configuredContext = newBase;
        try {
            SharedPreferences prefs = newBase.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String saved = prefs.getString(KEY_THEME, null);
            boolean isDark = "dark".equalsIgnoreCase(saved);
            if (!isDark && !"light".equalsIgnoreCase(saved)) {
                prefs.edit().putString(KEY_THEME, "light").commit();
                isDark = false;
            }

            int mode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
            AppCompatDelegate.setDefaultNightMode(mode);

            Configuration config = new Configuration(newBase.getResources().getConfiguration());
            config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) |
                (isDark ? Configuration.UI_MODE_NIGHT_YES : Configuration.UI_MODE_NIGHT_NO);

            configuredContext = newBase.createConfigurationContext(config);
        } catch (Exception ignored) {}

        super.attachBaseContext(configuredContext);
    }

    public String resolveStartupTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, null);
        if ("dark".equalsIgnoreCase(saved)) {
            return "dark";
        }
        if (!"light".equalsIgnoreCase(saved)) {
            prefs.edit().putString(KEY_THEME, "light").commit();
        }
        return "light";
    }

    @Override
    public void setTheme(int resid) {
        boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());
        if (resid == R.style.AppTheme_NoActionBarLaunch
            || resid == R.style.AppTheme_NoActionBarLaunch_Light
            || resid == R.style.AppTheme_NoActionBarLaunch_Dark) {
            super.setTheme(isDark ? R.style.AppTheme_NoActionBarLaunch_Dark : R.style.AppTheme_NoActionBarLaunch_Light);
            return;
        }
        if (resid == R.style.AppTheme_NoActionBar) {
            super.setTheme(isDark ? R.style.AppTheme_NoActionBar_Dark : R.style.AppTheme_NoActionBar_Light);
            return;
        }
        super.setTheme(resid);
    }

    @Override
    protected void load() {
        boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());
        int splashBgColor = isDark ? Color.parseColor("#060E0E") : Color.parseColor("#F2F6F5");
        int appBgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

        attachSplashOverlay(isDark, splashBgColor);

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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        launchStartTime = System.currentTimeMillis();
        String initialTheme = resolveStartupTheme();
        boolean isDark = "dark".equalsIgnoreCase(initialTheme);
        int splashBgColor = isDark ? Color.parseColor("#060E0E") : Color.parseColor("#F2F6F5");
        int nightMode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;

        // Force AppCompat night mode and delegate before installSplashScreen and super.onCreate
        try {
            AppCompatDelegate.setDefaultNightMode(nightMode);
            getDelegate().setLocalNightMode(nightMode);
            getDelegate().applyDayNight();
        } catch (Exception ignored) {}

        int launchTheme = isDark
            ? R.style.AppTheme_NoActionBarLaunch_Dark
            : R.style.AppTheme_NoActionBarLaunch_Light;
        int targetTheme = isDark
            ? R.style.AppTheme_NoActionBar_Dark
            : R.style.AppTheme_NoActionBar_Light;

        setTheme(launchTheme);

        SplashScreen splashScreen = null;
        try {
            splashScreen = SplashScreen.installSplashScreen(this);
            splashScreen.setOnExitAnimationListener(provider -> {
                try {
                    View v = provider.getView();
                    if (v != null) {
                        v.setBackgroundColor(splashBgColor);
                    }
                } catch (Exception ignored) {}
                provider.remove();
            });
        } catch (Exception ignored) {}

        setTheme(targetTheme);
        try {
            getTheme().applyStyle(targetTheme, true);
        } catch (Exception ignored) {}

        configureWindowBars(isDark, splashBgColor);

        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                getSplashScreen().setSplashScreenTheme(launchTheme);
            } catch (Exception ignored) {}
        }

        setTheme(targetTheme);
        try {
            getTheme().applyStyle(targetTheme, true);
            if (getApplication() != null && getApplication().getTheme() != null) {
                getApplication().setTheme(targetTheme);
                getApplication().getTheme().applyStyle(targetTheme, true);
            }
        } catch (Exception ignored) {}

        configureWindowBars(isDark, splashBgColor);
        attachSplashOverlay(isDark, splashBgColor);
        setupThemeBridge();
    }

    private void configureWindowBars(boolean isDark, int bgColor) {
        Window window = getWindow();
        if (window == null) return;

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        window.setStatusBarColor(bgColor);
        window.setNavigationBarColor(bgColor);
        if (splashDismissed) {
            window.setBackgroundDrawable(new ColorDrawable(bgColor));
        }

        View decor = window.getDecorView();
        if (decor != null) {
            if (splashDismissed) {
                decor.setBackgroundColor(bgColor);
            }
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

    private void attachSplashOverlay(boolean isDark, int splashBgColor) {
        if (splashOverlay != null || splashDismissed) return;
        try {
            ViewGroup root = findViewById(android.R.id.content);
            if (root == null) return;

            FrameLayout overlay = new FrameLayout(this) {
                @Override
                protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
                    super.onLayout(changed, left, top, right, bottom);
                    centerLogoToPhysicalScreen();
                }
            };
            overlay.setTag("habbitrack_splash_overlay");
            overlay.setBackgroundColor(splashBgColor);
            overlay.setClickable(true);
            overlay.setFocusable(true);
            overlay.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));

            ImageView iv = new ImageView(this);
            iv.setTag("habbitrack_splash_logo");
            iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
            int logoRes = isDark ? R.drawable.splash_icon_dark : R.drawable.splash_icon_light;
            iv.setImageResource(logoRes);

            DisplayMetrics dm = getResources().getDisplayMetrics();
            int iconBoxSize = Math.round(288f * dm.density);

            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                iconBoxSize,
                iconBoxSize,
                Gravity.CENTER
            );
            overlay.addView(iv, lp);

            splashLogoView = iv;
            splashOverlay = overlay;
            root.addView(overlay);
            centerLogoToPhysicalScreen();
        } catch (Exception ignored) {}

        // Fallback safety timeout if WebView takes too long
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (!splashDismissed) {
                isWebReady = true;
                dismissSplash();
            }
        }, 3500);
    }

    private void centerLogoToPhysicalScreen() {
        try {
            if (splashLogoView == null || getWindow() == null) return;
            View decor = getWindow().getDecorView();
            if (decor == null) return;
            int topPad = decor.getPaddingTop();
            int bottomPad = decor.getPaddingBottom();
            float offsetY = (bottomPad - topPad) / 2.0f;
            if (Math.abs(splashLogoView.getTranslationY() - offsetY) > 0.5f) {
                splashLogoView.setTranslationY(offsetY);
            }
        } catch (Exception ignored) {}
    }

    public void onWebRenderComplete() {
        runOnUiThread(() -> {
            isWebReady = true;
            if (splashDismissed || splashDismissScheduled) return;

            long elapsed = System.currentTimeMillis() - launchStartTime;
            long minDuration = 650;
            if (elapsed < minDuration) {
                splashDismissScheduled = true;
                long remaining = minDuration - elapsed;
                new Handler(Looper.getMainLooper()).postDelayed(this::dismissSplash, remaining);
            } else {
                dismissSplash();
            }
        });
    }

    public void dismissSplash() {
        runOnUiThread(() -> {
            if (splashDismissed) return;
            long elapsed = System.currentTimeMillis() - launchStartTime;
            if (!isWebReady && elapsed < 3500) {
                return;
            }
            splashDismissed = true;
            if (splashOverlay != null) {
                try {
                    if (splashOverlay.getParent() != null) {
                        ((ViewGroup) splashOverlay.getParent()).removeView(splashOverlay);
                    }
                } catch (Exception ignored) {}
                splashOverlay = null;
                splashLogoView = null;
            }
            applyTheme(getSavedTheme());
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
        if (splashDismissed) {
            applyTheme(getSavedTheme());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupThemeBridge();
        if (splashDismissed) {
            applyTheme(getSavedTheme());
        }
    }

    public String getSavedTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, "light");
        return "dark".equalsIgnoreCase(saved) ? "dark" : "light";
    }

    public void saveAndApplyTheme(String theme) {
        if (theme == null) return;
        final String t = "dark".equalsIgnoreCase(theme.trim()) ? "dark" : "light";
        final boolean isDark = "dark".equals(t);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, t).commit();

        runOnUiThread(() -> {
            int nightMode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
            try {
                AppCompatDelegate.setDefaultNightMode(nightMode);
                getDelegate().setLocalNightMode(nightMode);
                getDelegate().applyDayNight();
            } catch (Exception ignored) {}

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                try {
                    UiModeManager uim = getSystemService(UiModeManager.class);
                    if (uim != null) {
                        int targetMode = isDark ? UiModeManager.MODE_NIGHT_YES : UiModeManager.MODE_NIGHT_NO;
                        uim.setApplicationNightMode(targetMode);
                    }
                } catch (Exception ignored) {}
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    getSplashScreen().setSplashScreenTheme(
                        isDark
                            ? R.style.AppTheme_NoActionBarLaunch_Dark
                            : R.style.AppTheme_NoActionBarLaunch_Light
                    );
                } catch (Exception ignored) {}
            }
            applyTheme(t);
        });
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

    public void applyTheme(final String theme) {
        runOnUiThread(() -> {
            boolean isDark = "dark".equalsIgnoreCase(theme);
            int appBarColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
            int splashBgColor = isDark ? Color.parseColor("#060E0E") : Color.parseColor("#F2F6F5");
            int activeBarColor = (!splashDismissed && splashOverlay != null) ? splashBgColor : appBarColor;
            int styleRes = isDark ? R.style.AppTheme_NoActionBar_Dark : R.style.AppTheme_NoActionBar_Light;

            Window window = getWindow();
            if (window != null) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setStatusBarContrastEnforced(false);
                    window.setNavigationBarContrastEnforced(false);
                }

                window.setStatusBarColor(activeBarColor);
                window.setNavigationBarColor(activeBarColor);
                if (splashDismissed) {
                    window.setBackgroundDrawable(new ColorDrawable(activeBarColor));
                }

                View decor = window.getDecorView();
                if (decor != null) {
                    if (splashDismissed) {
                        setHierarchyBackgroundColor(decor, activeBarColor);
                    }
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

                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().setBackgroundColor(appBarColor);
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

    private void setHierarchyBackgroundColor(View view, int color) {
        if (view == null) return;
        Object tag = view.getTag();
        if ("habbitrack_splash_overlay".equals(tag) || "habbitrack_splash_logo".equals(tag)) {
            return;
        }
        try {
            view.setBackgroundColor(color);
            if (view instanceof androidx.coordinatorlayout.widget.CoordinatorLayout) {
                ((androidx.coordinatorlayout.widget.CoordinatorLayout) view).setStatusBarBackgroundColor(color);
            }
        } catch (Exception ignored) {}
        if (view instanceof ViewGroup && !(view instanceof WebView)) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                setHierarchyBackgroundColor(group.getChildAt(i), color);
            }
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyTheme(getSavedTheme());
    }
}
