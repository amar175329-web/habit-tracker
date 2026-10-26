package app.dailyos.habits;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.webkit.JavascriptInterface;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyTheme("light");
    }

    @Override
    public void onStart() {
        super.onStart();
        setupThemeBridge();
    }

    private void setupThemeBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> {
                bridge.getWebView().addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setTheme(final String theme) {
                        runOnUiThread(() -> applyTheme(theme));
                    }
                }, "AndroidTheme");
            });
        }
    }

    private void applyTheme(String theme) {
        boolean isDark = "dark".equalsIgnoreCase(theme);
        int bgColor = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");

        Window window = getWindow();
        if (window != null) {
            window.setStatusBarColor(bgColor);
            window.setNavigationBarColor(bgColor);

            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                // When status bar background is light (#F2F6F5), icons must be dark (true)
                // When status bar background is dark (#0B1112), icons must be light (false)
                controller.setAppearanceLightStatusBars(!isDark);
                controller.setAppearanceLightNavigationBars(!isDark);
            }

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setBackgroundColor(bgColor);
            }
        }
    }
}
