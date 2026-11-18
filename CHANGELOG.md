# Changelog

Each release on GitHub uses its section from this file as release notes, followed by install instructions. Write sections for people using the extension: what they will see and do.

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
