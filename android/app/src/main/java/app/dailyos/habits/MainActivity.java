package app.dailyos.habits;

import android.app.UiModeManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.view.ActionMode;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

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

    private void updateSplashScreenTheme(boolean isDark) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            try {
                int splashStyle = isDark ? R.style.Theme_Habbit_Splash_Dark : R.style.Theme_Habbit_Splash_Light;
                getSplashScreen().setSplashScreenTheme(splashStyle);
            } catch (Throwable ignored) {}
        }
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(newBase);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Read saved theme before any window creation or super.onCreate
        boolean isDark = "dark".equalsIgnoreCase(getSavedTheme());

        // 1. Android 13+ (API 33+): Set splash theme BEFORE super.onCreate / before first frame
        updateSplashScreenTheme(isDark);

        // 2. Android 11 and below: before first frame set window background from saved theme
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            int appBgColor = isDark ? Color.parseColor("#060E0E") : Color.parseColor("#F2F6F5");
            try {
                getWindow().setBackgroundDrawable(new ColorDrawable(appBgColor));
            } catch (Throwable ignored) {}
        }

        // 3. Install AndroidX splash screen & keep on screen until webview renders
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !isWebReady);

        // Fallback safety timeout (3500ms) in case web view fails to report readiness
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            isWebReady = true;
        }, 3500);

        registerPlugin(AppThemePlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure decor fits system windows so webview sits cleanly below status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 4. Enforce saved theme & night mode sync
        HabitApplication.applyInitialNightMode(this);

        // 5. Ensure splash theme is bound after activity creation
        updateSplashScreenTheme(isDark);

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
            Window window = getWindow();
            if (window != null) {
                WindowCompat.setDecorFitsSystemWindows(window, true);
                View decor = window.getDecorView();
                if (decor != null) {
                    try {
                        int flags = decor.getSystemUiVisibility();
                        flags &= ~View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
                        flags &= ~View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
                        decor.setSystemUiVisibility(flags);
                        ViewCompat.requestApplyInsets(decor);
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    private void configureWindowBars(boolean isDark) {
        int color = isDark ? Color.parseColor("#0B1112") : Color.parseColor("#F2F6F5");
        Window window = getWindow();
        if (window == null) return;

        WindowCompat.setDecorFitsSystemWindows(window, true);

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
                // Clear fullscreen and layout stable flags left behind by splash screen
                flags &= ~View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
                flags &= ~View.SYSTEM_UI_FLAG_LAYOUT_STABLE;

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
                ViewCompat.requestApplyInsets(decor);
            } catch (Exception ignored) {}
        }
    }

    public String getSavedTheme() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String saved = prefs.getString(KEY_THEME, null);
        if (saved == null) {
            saved = prefs.getString("dailyos_theme", null);
        }
        if (saved != null) {
            String clean = saved.trim().toLowerCase();
            if ("dark".equals(clean)) return "dark";
        }
        return "light";
    }

    public void saveAndApplyTheme(String theme) {
        if (theme == null) return;
        final String cleanTheme = theme.trim().toLowerCase();
        final String t = "dark".equals(cleanTheme) ? "dark" : "light";
        final boolean isDark = "dark".equals(t);

        // 1. Commit immediately to SharedPreferences across both keys
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, t).putString("dailyos_theme", t).commit();

        // 2. Android 13+ (API 33+): call immediately inside theme-change handler
        updateSplashScreenTheme(isDark);

        // 3. Android 12 (API 31-32): set application night mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                UiModeManager uim = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                if (uim != null) {
                    int targetMode = isDark ? UiModeManager.MODE_NIGHT_YES : UiModeManager.MODE_NIGHT_NO;
                    uim.setApplicationNightMode(targetMode);
                }
            } catch (Exception ignored) {}
        }

        int nightMode = isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO;
        try {
            AppCompatDelegate.setDefaultNightMode(nightMode);
            getDelegate().setLocalNightMode(nightMode);
        } catch (Exception ignored) {}

        // 4. UI bar and webview color sync on UI thread
        runOnUiThread(() -> {
            updateSplashScreenTheme(isDark);
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

    private void registerThemeInterface(WebView webView) {
        if (webView == null || themeInterfaceRegistered) return;
        themeInterfaceRegistered = true;
        // Native long-click and action modes are allowed so users can Cut, Copy, Paste & Select All in text fields
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

                @JavascriptInterface
                public void share(final String title, final String text, final String url) {
                    runOnUiThread(() -> {
                        try {
                            Intent sendIntent = new Intent(Intent.ACTION_SEND);
                            sendIntent.setType("text/plain");
                            StringBuilder fullText = new StringBuilder();
                            if (text != null && !text.isEmpty()) {
                                fullText.append(text);
                            }
                            if (url != null && !url.isEmpty()) {
                                if (fullText.length() > 0) fullText.append("\n\n");
                                fullText.append(url);
                            }
                            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title != null && !title.isEmpty() ? title : "DailyOS");
                            sendIntent.putExtra(Intent.EXTRA_TEXT, fullText.toString());
                            Intent chooser = Intent.createChooser(sendIntent, title != null && !title.isEmpty() ? title : "Share via");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                        } catch (Exception e) {
                            Log.e("MainActivity", "Native share failed", e);
                        }
                    });
                }

                @JavascriptInterface
                public boolean saveJsonFile(final String filename, final String jsonContent) {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                            values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                            values.put(MediaStore.Downloads.IS_PENDING, 1);

                            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                            if (uri != null) {
                                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                                    if (os != null) {
                                        os.write(jsonContent.getBytes(StandardCharsets.UTF_8));
                                        os.flush();
                                    }
                                }
                                values.clear();
                                values.put(MediaStore.Downloads.IS_PENDING, 0);
                                getContentResolver().update(uri, values, null, null);

                                runOnUiThread(() -> {
                                    Toast.makeText(MainActivity.this, "Saved " + filename + " to Downloads", Toast.LENGTH_LONG).show();
                                });
                                return true;
                            }
                        } else {
                            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            if (!downloadsDir.exists()) downloadsDir.mkdirs();
                            File file = new File(downloadsDir, filename);
                            try (FileOutputStream fos = new FileOutputStream(file)) {
                                fos.write(jsonContent.getBytes(StandardCharsets.UTF_8));
                                fos.flush();
                            }
                            MediaScannerConnection.scanFile(MainActivity.this, new String[]{file.getAbsolutePath()}, new String[]{"application/json"}, null);
                            runOnUiThread(() -> {
                                Toast.makeText(MainActivity.this, "Saved " + filename + " to Downloads", Toast.LENGTH_LONG).show();
                            });
                            return true;
                        }
                    } catch (Exception e) {
                        Log.e("MainActivity", "Failed to save JSON backup", e);
                    }
                    return false;
                }

                @JavascriptInterface
                public void shareJsonFile(final String filename, final String jsonContent) {
                    runOnUiThread(() -> {
                        try {
                            File cacheDir = new File(getCacheDir(), "backups");
                            if (!cacheDir.exists()) cacheDir.mkdirs();
                            File backupFile = new File(cacheDir, filename);
                            try (FileOutputStream fos = new FileOutputStream(backupFile)) {
                                fos.write(jsonContent.getBytes(StandardCharsets.UTF_8));
                                fos.flush();
                            }
                            Uri contentUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                backupFile
                            );

                            Intent shareIntent = new Intent(Intent.ACTION_SEND);
                            shareIntent.setType("application/json");
                            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                            shareIntent.putExtra(Intent.EXTRA_SUBJECT, filename);
                            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                            Intent chooser = Intent.createChooser(shareIntent, "Share Backup File");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                        } catch (Exception e) {
                            Log.e("MainActivity", "Failed to share JSON file", e);
                            share(filename, jsonContent, "");
                        }
                    });
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
