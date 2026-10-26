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
      style: "LIGHT",
      backgroundColor: "#F2F6F5",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F2F6F5",
      androidSplashResourceName: "splash",
    },
  },
};

export default config;
