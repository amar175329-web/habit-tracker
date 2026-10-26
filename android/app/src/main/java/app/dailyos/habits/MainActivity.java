package app.dailyos.habits;

import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PREFS_NAME = "dailyos_theme_prefs";
    private static final String KEY_THEME = "dailyos_saved_theme";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Detect saved theme or system night mode on cold boot immediately
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isSystemNight = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        String initialTheme = prefs.getString(KEY_THEME, isSystemNight ? "dark" : "light");

        applyTheme(initialTheme);
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentTheme = prefs.getString(KEY_THEME, "light");
        applyTheme(currentTheme);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, null);
        if (saved == null) {
            boolean isNight = (newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
            applyTheme(isNight ? "dark" : "light");
        }
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

            // Disable long click and contextual copy/share popups across WebView
            webView.setLongClickable(false);
            webView.setOnLongClickListener(v -> true);
            webView.setHapticFeedbackEnabled(false);

            // Expose AndroidTheme interface to JavaScript
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setTheme(final String theme) {
                    runOnUiThread(() -> {
                        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                        prefs.edit().putString(KEY_THEME, theme).apply();
                        applyTheme(theme);
                    });
                }
            }, "AndroidTheme");

            // Evaluate theme from document after page loads
            webView.postDelayed(() -> {
                webView.evaluateJavascript(
                    "(function() { return localStorage.getItem('dailyos_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'); })()",
                    value -> {
                        if (value != null && !value.equals("null")) {
                            String theme = value.replace("\"", "").trim();
                            if ("dark".equalsIgnoreCase(theme) || "light".equalsIgnoreCase(theme)) {
                                runOnUiThread(() -> {
                                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                    prefs.edit().putString(KEY_THEME, theme).apply();
                                    applyTheme(theme);
                                });
                            }
                        }
                    }
                );
            }, 300);
        }
    }

    public void applyTheme(String theme) {
        boolean isDark = "dark".equalsIgnoreCase(theme);
        int bgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }

            window.setStatusBarColor(bgColor);
            window.setNavigationBarColor(bgColor);

            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                // When status/nav bar background is light (#F2F6F5), icons must be dark (true)
                // When status/nav bar background is dark (#0B1112), icons must be white (false)
                controller.setAppearanceLightStatusBars(!isDark);
                controller.setAppearanceLightNavigationBars(!isDark);
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(bgColor);
            }
        }
    }
}
