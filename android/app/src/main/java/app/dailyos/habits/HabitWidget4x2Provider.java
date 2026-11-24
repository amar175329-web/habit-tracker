package app.dailyos.habits;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class HabitWidget4x2Provider extends AppWidgetProvider {

    public static final String PREFS_NAME = "habbitrack_widget_prefs";
    public static final String KEY_STREAK = "widget_4x2_streak";
    public static final String KEY_HABIT_1_NAME = "widget_h1_name";
    public static final String KEY_HABIT_1_DONE = "widget_h1_done";
    public static final String KEY_HABIT_2_NAME = "widget_h2_name";
    public static final String KEY_HABIT_2_DONE = "widget_h2_done";
    public static final String KEY_HABIT_3_NAME = "widget_h3_name";
    public static final String KEY_HABIT_3_DONE = "widget_h3_done";
    public static final String KEY_THEME = "widget_theme";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String streak = prefs.getString(KEY_STREAK, "0");
        String theme = prefs.getString(KEY_THEME, "light");

        String h1Name = prefs.getString(KEY_HABIT_1_NAME, "Workout");
        boolean h1Done = prefs.getBoolean(KEY_HABIT_1_DONE, false);
        String h2Name = prefs.getString(KEY_HABIT_2_NAME, "Study");
        boolean h2Done = prefs.getBoolean(KEY_HABIT_2_DONE, false);
        String h3Name = prefs.getString(KEY_HABIT_3_NAME, "Book listening");
        boolean h3Done = prefs.getBoolean(KEY_HABIT_3_DONE, false);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_4x2);
        views.setTextViewText(R.id.widget_4x2_streak, streak);

        // Habit 1
        views.setTextViewText(R.id.widget_4x2_name_1, h1Name);
        views.setTextViewText(R.id.widget_4x2_check_1, h1Done ? "✓" : "○");
        views.setTextColor(R.id.widget_4x2_check_1, h1Done ? Color.parseColor("#14B8A6") : Color.parseColor("#94A3B8"));

        // Habit 2
        views.setTextViewText(R.id.widget_4x2_name_2, h2Name);
        views.setTextViewText(R.id.widget_4x2_check_2, h2Done ? "✓" : "○");
        views.setTextColor(R.id.widget_4x2_check_2, h2Done ? Color.parseColor("#14B8A6") : Color.parseColor("#94A3B8"));

        // Habit 3
        views.setTextViewText(R.id.widget_4x2_name_3, h3Name);
        views.setTextViewText(R.id.widget_4x2_check_3, h3Done ? "✓" : "○");
        views.setTextColor(R.id.widget_4x2_check_3, h3Done ? Color.parseColor("#14B8A6") : Color.parseColor("#94A3B8"));

        // Theme styling
        if ("dark".equalsIgnoreCase(theme)) {
            views.setInt(R.id.widget_4x2_root, "setBackgroundResource", R.drawable.widget_bg_dark);
            views.setTextColor(R.id.widget_4x2_streak, Color.parseColor("#F8FAFC"));
            views.setTextColor(R.id.widget_4x2_title, Color.parseColor("#F8FAFC"));
            views.setTextColor(R.id.widget_4x2_name_1, Color.parseColor("#E2E8F0"));
            views.setTextColor(R.id.widget_4x2_name_2, Color.parseColor("#E2E8F0"));
            views.setTextColor(R.id.widget_4x2_name_3, Color.parseColor("#E2E8F0"));
            views.setInt(R.id.widget_4x2_divider, "setBackgroundColor", Color.parseColor("#334155"));
            views.setInt(R.id.widget_4x2_add, "setBackgroundResource", R.drawable.widget_bg_dark);
            views.setTextColor(R.id.widget_4x2_add, Color.parseColor("#E2E8F0"));
        } else if ("gold".equalsIgnoreCase(theme)) {
            views.setInt(R.id.widget_4x2_root, "setBackgroundResource", R.drawable.widget_bg_gold);
            views.setTextColor(R.id.widget_4x2_streak, Color.parseColor("#854D0E"));
            views.setTextColor(R.id.widget_4x2_title, Color.parseColor("#854D0E"));
            views.setTextColor(R.id.widget_4x2_name_1, Color.parseColor("#713F12"));
            views.setTextColor(R.id.widget_4x2_name_2, Color.parseColor("#713F12"));
            views.setTextColor(R.id.widget_4x2_name_3, Color.parseColor("#713F12"));
            views.setInt(R.id.widget_4x2_divider, "setBackgroundColor", Color.parseColor("#FEF08A"));
            views.setInt(R.id.widget_4x2_add, "setBackgroundResource", R.drawable.widget_bg_gold);
            views.setTextColor(R.id.widget_4x2_add, Color.parseColor("#854D0E"));
        } else {
            views.setInt(R.id.widget_4x2_root, "setBackgroundResource", R.drawable.widget_bg_light);
            views.setTextColor(R.id.widget_4x2_streak, Color.parseColor("#0F172A"));
            views.setTextColor(R.id.widget_4x2_title, Color.parseColor("#0F172A"));
            views.setTextColor(R.id.widget_4x2_name_1, Color.parseColor("#334155"));
            views.setTextColor(R.id.widget_4x2_name_2, Color.parseColor("#334155"));
            views.setTextColor(R.id.widget_4x2_name_3, Color.parseColor("#334155"));
            views.setInt(R.id.widget_4x2_divider, "setBackgroundColor", Color.parseColor("#E2E8F0"));
            views.setInt(R.id.widget_4x2_add, "setBackgroundResource", R.drawable.widget_bg_light);
            views.setTextColor(R.id.widget_4x2_add, Color.parseColor("#64748B"));
        }

        // Tap opens Today (MainActivity)
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_4x2_root, pendingIntent);

        // Tap '+' button opens New Habit
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        addIntent.putExtra("navigate_to", "/new-habit");
        PendingIntent addPendingIntent = PendingIntent.getActivity(
            context,
            2,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_4x2_add, addPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
