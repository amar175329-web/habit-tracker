# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Capacitor Bridge & Plugins
-keep public class * extends com.getcapacitor.Plugin
-keep public class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.BridgeActivity { *; }
-keep class * implements com.getcapacitor.PluginMethod { *; }

# Keep Webkit JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugin classes if used
-keep class org.apache.cordova.** { *; }
-keep interface org.apache.cordova.** { *; }

# Keep native methods and AndroidX view models
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve line numbers for debugging crash traces in Play Console vitals
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
