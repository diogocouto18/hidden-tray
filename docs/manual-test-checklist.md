# Manual test checklist (GNOME Shell 50)

Run on a real session after `make install` and a log out / log in. Watch
`journalctl --user -b -f | grep -iE 'hidden-tray|JS ERROR'` while testing.

Before the first run: if Top Bar Organizer is installed, clear its `hide` / `show`
lists for the icons Hidden Tray will manage.

- [ ] 1. Fresh enable: arrow appears left of the tray icons; nothing hidden (new icons are visible).
- [ ] 2. Right click → set three icons to *Collapsible* → collapse hides them, expand shows them.
- [ ] 3. Set an app to *Always hidden* (open it): hidden when expanded; middle click reveals it; collapsing hides everything again.
- [ ] 4. Auto-collapse 5 s: collapses after expanding; does not collapse while the pointer is on the top bar or a tray menu is open; collapses ~5 s after leaving / closing.
- [ ] 5. `Super+Alt+H` toggles; `Super+Alt+Shift+H` reveals everything.
- [ ] 6. After clicking the arrow and using its menu, **Super and Super+V (or any global shortcut) still work**.
- [ ] 7. An app that registers its tray icon twice (e.g. Solaar after login) shows once in the menu; both icons obey the zone.
- [ ] 8. Restart a tray app while collapsed → its icon comes back hidden, no errors.
- [ ] 8b. Quit a collapsible tray app while collapsed (don't restart it), then toggle the arrow and open its right-click menu → the app is gone from the menu, no "already disposed" errors in the journal.
- [ ] 9. Log out / in: zones remembered, state collapsed, no errors in the journal for the logout.
- [ ] 10. `gnome-extensions disable` while collapsed and while revealed → every icon visible again, no errors.
- [ ] 11. With Top Bar Organizer enabled: reorder items in its prefs → arrow stays left of the tray icons and zones still apply.
- [ ] 12. Preferences: list shows icons with the right zones, "Not running" items can be forgotten, zone/new-icon/auto-collapse/shortcut changes apply without re-login.
