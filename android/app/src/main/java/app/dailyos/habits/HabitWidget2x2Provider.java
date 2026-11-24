package app.dailyos.habits;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class HabitWidget2x2Provider extends AppWidgetProvider {

    public static final String PREFS_NAME = "habbitrack_widget_prefs";
    public static final String KEY_VALUE = "widget_2x2_val";
    public static final String KEY_LABEL = "widget_2x2_lbl";
    public static final String KEY_ICON = "widget_2x2_icn";
    public static final String KEY_THEME = "widget_theme";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String val = prefs.getString(KEY_VALUE, "0");
        String label = prefs.getString(KEY_LABEL, "Aaj shuru karo");
        String icon = prefs.getString(KEY_ICON, "🔥");
        String theme = prefs.getString(KEY_THEME, "light");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_2x2);
        views.setTextViewText(R.id.widget_2x2_value, val);
        views.setTextViewText(R.id.widget_2x2_label, label);
        views.setTextViewText(R.id.widget_2x2_icon, icon);

        // Apply theme styling
        if ("dark".equalsIgnoreCase(theme)) {
            views.setInt(R.id.widget_2x2_root, "setBackgroundResource", R.drawable.widget_bg_dark);
            views.setTextColor(R.id.widget_2x2_value, Color.parseColor("#F8FAFC"));
            views.setTextColor(R.id.widget_2x2_label, Color.parseColor("#94A3B8"));
        } else if ("gold".equalsIgnoreCase(theme)) {
            views.setInt(R.id.widget_2x2_root, "setBackgroundResource", R.drawable.widget_bg_gold);
            views.setTextColor(R.id.widget_2x2_value, Color.parseColor("#854D0E"));
            views.setTextColor(R.id.widget_2x2_label, Color.parseColor("#A16207"));
        } else {
            views.setInt(R.id.widget_2x2_root, "setBackgroundResource", R.drawable.widget_bg_light);
            views.setTextColor(R.id.widget_2x2_value, Color.parseColor("#0F172A"));
            views.setTextColor(R.id.widget_2x2_label, Color.parseColor("#64748B"));
        }

        // Tap opens Today (MainActivity)
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_2x2_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
