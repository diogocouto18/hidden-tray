# Changelog

Each release on GitHub uses its section from this file as release notes, followed by install instructions. Write sections for people using the extension: what they will see and do.

## 1.0.1 — 2026-11-18

### Fixes

- **A tray icon's menu no longer stays open** when its icon is collapsed by the shortcut or by auto-collapse.
- **Tray icons on the left or in the center of the top bar** (Ubuntu's AppIndicators *tray position* setting) are now detected as they appear.
- **Preferences show "Not running" accurately**: the bin button only appears for apps that really aren't running, so it can't remove the zone of an app you're using.
- **Preferences stay in sync**: zone changes made from the arrow's right-click menu show up immediately, and the list no longer redraws while you're choosing an option.
- Two apps that share a tray name no longer produce stray entries in Preferences.
- A damaged icon list in the settings can no longer stop the list from updating.
- **Touchscreens**: tapping the arrow now collapses / expands.
- Smaller clean-ups: fewer leftovers when tray apps quit, at logout and when the extension is disabled.

After upgrading, log out and back in once.

## 1.0.0 — 2026-11-18

### What's new

First release — Hidden Bar for GNOME.

- **Arrow in the top bar**: click it to collapse or expand the tray icons you chose. Collapsed it shows **‹**, expanded **›**.
- **Three zones per icon**: *Always visible*, *Collapsible* (hidden while collapsed) and *Always hidden* (shown only when you reveal everything with a **middle click** on the arrow, until the next collapse).
- **Right-click the arrow** to move any running icon to another zone; the change applies immediately.
- **Preferences** (right-click → *Preferences…*): every icon Hidden Tray has seen, including apps that aren't running (forget them with the bin button), the zone for new icons, auto-collapse and shortcuts.
- **Auto-collapse** after 5–60 s, off by default. It waits while the pointer is on the top bar or a menu is open.
- **Shortcuts**: `Super+Alt+H` collapses / expands, `Super+Alt+Shift+H` reveals everything. Change them in Preferences (they need Ctrl, Alt or Super).
- **New icons stay visible** until you decide otherwise — nothing disappears by surprise.
- Icons that share a name (such as the three `update-notifier` entries) are listed separately, and apps that register their tray icon twice are handled as one.
- Works on top of Ubuntu's built-in AppIndicators (it doesn't replace them) and alongside Top Bar Organizer. Don't also hide the same icons with Top Bar Organizer's *Forcefully Hide*.
