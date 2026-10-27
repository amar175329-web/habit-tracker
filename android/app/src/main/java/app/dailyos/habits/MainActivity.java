package app.dailyos.habits;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.View;
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

        // Retrieve saved theme or default to light theme (#F2F6F5)
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String initialTheme = prefs.getString(KEY_THEME, "light");

        applyTheme(initialTheme);
        setupThemeBridge();

        View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
            decor.post(() -> applyTheme(initialTheme));
            decor.postDelayed(() -> applyTheme(initialTheme), 150);
            decor.postDelayed(() -> applyTheme(initialTheme), 450);
            decor.postDelayed(() -> applyTheme(initialTheme), 1000);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupThemeBridge();
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentTheme = prefs.getString(KEY_THEME, "light");
        applyTheme(currentTheme);
        View decor = getWindow() != null ? getWindow().getDecorView() : null;
        if (decor != null) {
            decor.postDelayed(() -> applyTheme(currentTheme), 150);
            decor.postDelayed(() -> applyTheme(currentTheme), 500);
        }
        syncThemeFromWeb();
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
            try {
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setTheme(final String theme) {
                        runOnUiThread(() -> {
                            if (theme != null && ("dark".equalsIgnoreCase(theme) || "light".equalsIgnoreCase(theme))) {
                                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                prefs.edit().putString(KEY_THEME, theme.toLowerCase()).apply();
                                applyTheme(theme);
                            }
                        });
                    }
                }, "AndroidTheme");
            } catch (Exception ignored) {}

            syncThemeFromWeb();
        }
    }

    private void syncThemeFromWeb() {
        if (bridge != null && bridge.getWebView() != null) {
            final WebView webView = bridge.getWebView();
            webView.postDelayed(() -> {
                try {
                    webView.evaluateJavascript(
                        "(function() { return (document.documentElement.classList.contains('dark') || localStorage.getItem('dailyos_theme') === 'dark') ? 'dark' : 'light'; })()",
                        value -> {
                            if (value != null && !value.equals("null")) {
                                String theme = value.replace("\"", "").trim();
                                if ("dark".equalsIgnoreCase(theme) || "light".equalsIgnoreCase(theme)) {
                                    runOnUiThread(() -> {
                                        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                        prefs.edit().putString(KEY_THEME, theme.toLowerCase()).apply();
                                        applyTheme(theme);
                                    });
                                }
                            }
                        }
                    );
                } catch (Exception ignored) {}
            }, 300);
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

            View decor = window.getDecorView();
            if (decor != null) {
                try {
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
                    if (controller != null) {
                        // Light theme: dark icons on status bar and navigation bar
                        // Dark theme: white/light icons on status bar and navigation bar
                        controller.setAppearanceLightStatusBars(!isDark);
                        controller.setAppearanceLightNavigationBars(!isDark);
                    }
                } catch (Exception ignored) {}
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(barColor);
            }
        });
    }
}
