import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.habittracker.test",
  appName: "Habit Tracker",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
  },
};

export default config;
