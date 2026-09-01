# 🐮 DealWithTheCow - Chaotic Doomscroll Blocker (MV3)

A Manifest V3 Chrome Extension built to terminate short-form doomscrolling with floating Polish Cow interventions and atomic tab nuking.

---

## 🎯 Target Isolation & Safe Zones

* **Target Feeds (Monitored)**:
  * **Instagram**: Reels (`/reels/`, `/reel/`), Explore & Home scroll feeds.
  * **YouTube**: Shorts (`/shorts/`).
  * **TikTok**: Home FYP & Video feeds (`/`, `/foryou`, `/@user/video/*`).

* **Safe Zones (Explicitly Ignored)**:
  * **Instagram DMs & Chats**: `/direct/`, `/messages/`, or any active DM popup modal. All scroll counting pauses instantly and session counters reset.
  * **YouTube Safe Pages**: Regular video watch pages (`/watch`), YouTube Studio (`studio.youtube.com`), Comments, and Live Chat.
  * **Active User Typing**: Any text input, textarea, search bar, or `contenteditable` container is detected and ignored.

---

## ⚡ Core Mechanics & Timing Flow

1. **Active Mode (Customizable 1 to 20 Scrolls)**:
   * Users can configure the scroll threshold directly in the popup (Slider + Number input, 1 to 20, default: 20).
   * After reaching the limit:
     * **Stage 1 (12 Seconds)**: A centered Polish Cow GIF spawns smoothly in the middle of the page and plays `assets/audio/cow.mp3`. The background page remains intact.
     * **Stage 2**: Seamlessly transitions into a **pure black screen** with an **atomic bomb detonation** overlay that plays **exactly ONCE**.
     * **Stage 3**: Background service worker terminates the active tab (`chrome.tabs.remove`) and adds **+15 minutes** to your "Time Saved" counter in `chrome.storage.local`.

2. **The Placebo / Stealth Trap (5 to 15 Scrolls Random)**:
   * When toggled "OFF" in the popup, the UI pretends protection is disabled.
   * Internally, `stealthMode` engages and randomly selects an ambush limit between **5 and 15 scrolls**.
   * When tripped, a random the active feed video is camouflaged with the Polish Cow GIF.

3. **Dynamic Exit Interview**:
   * `background.js` keeps `chrome.runtime.setUninstallURL()` updated with `?saved=X`.
   * When uninstalled, `farewell.html` displays the Rickroll video and time-saved metrics.

---

## 📂 File Structure

```
DealWithTheCow/
├── manifest.json         # Manifest V3 configuration & permissions
├── background.js         # Service worker: tab removal & uninstall URL updater
├── content.js            # Isolated feed observer & 2-stage execution flow
├── overlay.css           # Centered 12s cow card & single-play atomic explosion
├── farewell.html         # Rickroll exit interview page
├── popup/
│   ├── popup.html        # Popup UI with slider (1-20) & placebo switch
│   ├── popup.css         # Dark cyberpunk styling
│   └── popup.js          # Popup logic & storage sync
├── icons/
│   ├── icon-16.png       # 16x16 icon
│   ├── icon-48.png       # 48x48 icon
│   └── icon-128.png      # 128x128 icon
└── assets/
    ├── audio/
    │   └── cow.mp3       # Polish cow audio (User provided)
    └── images/
        ├── polish_cow.gif# Animated Dancing Polish Cow (User provided)
        └── explosion.gif # (Optional) Atomic explosion GIF (User provided)
```
Made by Debadreet Banik