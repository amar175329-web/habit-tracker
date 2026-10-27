import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.habittracker.test",
  appName: "Habbitrack",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SystemBars: {
      style: "LIGHT",
    },
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
