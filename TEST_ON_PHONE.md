# Test Habit Tracker on your phone

## Install
1. Open the Cloudflare link (get-app.html) in Chrome on the phone and tap Download.
2. When Android asks, allow Chrome to "Install unknown apps" (one time).
3. Open the downloaded file. If Play Protect warns, tap "More details" then "Install anyway" (it is a test build).
4. Open the app. You should see "No habits yet".
5. Optional: the same link can also be installed as a web app (Chrome menu > Install app).

## Does data stay on the phone? (do in this order)
1. Add 3 habits, tick some, log sleep and mood, write today's reflection.
2. Swipe the app away from recent apps. Open again. Everything must still be there.
3. Turn on airplane mode, change data, turn it off. Data must still be there.
4. Restart the phone. Open the app. Data must still be there.
5. Settings > Apps > Habit Tracker > Storage > Clear cache. Data must STILL be there.
6. Data and Backup > Export JSON. Check that a file appears in Downloads/Documents.
7. Now the risky test: uninstall the app. Install it again. The data will be EMPTY (this is normal for Android). The first screen must offer "Restore from backup file" and "Use cloud key". Restore from the exported file. Everything must come back.
8. Add a Turso URL and token in Data and Backup. It must say Verified. Uninstall, reinstall, paste the same key: everything must come back.

## Also check
Dark mode, large font size, rotating the screen, the back button, a past day (view only, unlock uses a pass), the streak flame, the sleep dial dragging, and anything that is cut off.

## Tell me
What worked, what failed, which step number, and a screenshot of any problem.
