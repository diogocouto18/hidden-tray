# Hidden Tray

**Hidden Bar for GNOME.** Collapse the tray icons you don't need all the time behind an arrow in the top bar, and bring them back with one click.

![Hidden Tray collapsing and expanding tray icons in the GNOME top bar](docs/demo.gif)

GNOME is the only major Linux desktop without this built in (KDE and XFCE have it). Hidden Tray adds it on top of your existing tray support — it does **not** replace Ubuntu's AppIndicator extension.

## Features

- **Arrow in the top bar** — left click collapses / expands.
- **Three zones per icon**

  | Zone | Collapsed | Expanded | Revealed (middle click) |
  |---|---|---|---|
  | Always visible | shown | shown | shown |
  | Collapsible | hidden | shown | shown |
  | Always hidden | hidden | hidden | shown |

- **Right click the arrow** to move any running icon to another zone, instantly.
- **Preferences window** listing every icon Hidden Tray has seen (including apps that aren't running), the zone for new icons, auto-collapse and shortcuts.
- **Auto-collapse** after 5–60 s (off by default); it waits while the pointer is on the top bar or a menu is open.
- **Keyboard shortcuts** — `Super+Alt+H` collapse / expand, `Super+Alt+Shift+H` reveal everything (both changeable).
- **New icons stay visible** until you decide otherwise — nothing disappears by surprise.
- **Tells apart icons that share a name** (e.g. several `update-notifier` entries, or two apps registering the same tray Id).

## Requirements

- GNOME Shell **50** (tested on Ubuntu 26.04 LTS).
- A tray (AppIndicator / StatusNotifierItem) extension: Ubuntu's built-in *Ubuntu AppIndicators* or *AppIndicator and KStatusNotifierItem Support*.

## Install

From a release (recommended): download `hidden-tray@diogocouto18.github.io.shell-extension.zip` from the [latest release](https://github.com/diogocouto18/hidden-tray/releases/latest), then:

```bash
gnome-extensions install --force hidden-tray@diogocouto18.github.io.shell-extension.zip
```

From source:

```bash
git clone https://github.com/diogocouto18/hidden-tray.git
cd hidden-tray
make install
```

Either way, log out and back in (Wayland loads new extensions at login) and enable it:

```bash
gnome-extensions enable hidden-tray@diogocouto18.github.io
```

## Usage

| Action | Result |
|---|---|
| Left click on the arrow | Collapse / expand |
| Middle click on the arrow | Show everything, including always-hidden icons, until the next collapse |
| Right click on the arrow | Pick each running icon's zone; open Preferences |
| `Super+Alt+H` | Collapse / expand |
| `Super+Alt+Shift+H` | Reveal everything |

Preferences: right click the arrow → **Preferences…**, or `gnome-extensions prefs hidden-tray@diogocouto18.github.io`.

### Using it with Top Bar Organizer

Hidden Tray works with Top Bar Organizer enabled and keeps its arrow to the left of the tray icons. Don't also hide the same icons with Top Bar Organizer's *Forcefully Hide* — let one extension own each icon's visibility.

## Development

```bash
npm ci
make test      # unit tests for the pure logic (node --test)
make lint      # ESLint
make install   # build the zip and install it for your user
```

Releases: bump `version-name` in `extension/metadata.json` and add a `## X.Y.Z — date` section to [CHANGELOG.md](CHANGELOG.md), merge, then push a matching tag (`git tag v1.0.1 && git push origin v1.0.1`). The release workflow runs lint and tests, checks the tag against `version-name`, uses the CHANGELOG section (plus install instructions) as release notes — it fails if the section is missing — builds the zip with `scripts/pack.sh` and attaches it to a GitHub release.

Shell code can't be unit-tested outside GNOME Shell; `docs/manual-test-checklist.md` lists the manual checks.

Project layout:

- `extension/lib/core/` — pure logic (zones, identity keys, auto-collapse policy, known items), no `gi://` imports, covered by `tests/`.
- `extension/lib/shell/` — GNOME Shell glue (arrow button, tray tracking, zone menu).
- `extension/prefs.js` — preferences window.

## License

[MIT](LICENSE) © 2026 Diogo Couto
