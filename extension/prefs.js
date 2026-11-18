// Preferences window. Runs in its own process: it can't see the panel, so the
// icon list comes from the 'known-items' key the extension publishes.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {AUTO_COLLAPSE_CHOICES} from './lib/core/autoCollapse.js';
import {uniqueLabels} from './lib/core/identity.js';
import {forgetItem, parseKnown, serializeKnown} from './lib/core/knownItems.js';
import {Zone, isValidZone, zoneFor} from './lib/core/zones.js';

const ZONES = [Zone.VISIBLE, Zone.COLLAPSIBLE, Zone.ALWAYS_HIDDEN];
const ZONE_LABELS = ['Always visible', 'Collapsible', 'Always hidden'];

export default class HiddenTrayPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings; // keep alive with the window

        const page = new Adw.PreferencesPage();
        window.add(page);

        const icons = new Adw.PreferencesGroup({
            title: 'Icons',
            description: 'Choose where each tray icon lives. Collapsible icons hide behind the arrow; always-hidden ones show only on middle click or the reveal shortcut.',
        });
        page.add(icons);
        let iconRows = [];
        const rebuildIcons = () => {
            for (const row of iconRows)
                icons.remove(row);
            iconRows = buildIconRows(settings);
            for (const row of iconRows)
                icons.add(row);
        };
        rebuildIcons();
        const knownId = settings.connect('changed::known-items', rebuildIcons);

        const behaviour = new Adw.PreferencesGroup({title: 'Behaviour'});
        page.add(behaviour);
        behaviour.add(zoneComboRow('New icons', 'Zone for tray icons seen for the first time',
            settings.get_string('new-item-zone'),
            zone => settings.set_string('new-item-zone', zone)));
        behaviour.add(autoCollapseRow(settings));

        const shortcuts = new Adw.PreferencesGroup({title: 'Shortcuts'});
        page.add(shortcuts);
        shortcuts.add(shortcutRow(window, settings, 'toggle-shortcut', 'Collapse / expand'));
        shortcuts.add(shortcutRow(window, settings, 'reveal-shortcut', 'Reveal always-hidden'));

        window.connect('close-request', () => {
            settings.disconnect(knownId);
            return false;
        });
    }
}

function getZones(settings) {
    return settings.get_value('zones').deep_unpack();
}

function setZones(settings, zones) {
    settings.set_value('zones', new GLib.Variant('a{ss}', zones));
}

function buildIconRows(settings) {
    const known = parseKnown(settings.get_string('known-items'))
        .filter(item => item && typeof item.key === 'string' && typeof item.name === 'string');
    if (known.length === 0) {
        return [new Adw.ActionRow({
            title: 'No tray icons seen yet',
            subtitle: 'Icons appear here once the extension has seen them in the top bar.',
        })];
    }

    // The newest scan stamps live items with the same, latest time.
    const latest = known.reduce((max, item) => (item.lastSeen > max ? item.lastSeen : max), '');
    const labels = uniqueLabels(known);
    const newItemZone = settings.get_string('new-item-zone');

    return known.map(item => {
        const running = item.lastSeen === latest;
        const row = zoneComboRow(labels.get(item.key), running ? '' : 'Not running',
            zoneFor(item.key, getZones(settings), newItemZone),
            zone => setZones(settings, {...getZones(settings), [item.key]: zone}));
        if (!running) {
            const forget = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: 'Forget this icon',
                css_classes: ['flat'],
            });
            forget.connect('clicked', () => {
                const zones = getZones(settings);
                delete zones[item.key];
                setZones(settings, zones);
                settings.set_string('known-items',
                    serializeKnown(forgetItem(parseKnown(settings.get_string('known-items')), item.key)));
            });
            row.add_suffix(forget);
        }
        return row;
    });
}

function zoneComboRow(title, subtitle, current, onChange) {
    const row = new Adw.ComboRow({
        title,
        subtitle,
        model: Gtk.StringList.new(ZONE_LABELS),
        selected: Math.max(0, ZONES.indexOf(isValidZone(current) ? current : Zone.VISIBLE)),
    });
    row.connect('notify::selected', () => onChange(ZONES[row.selected]));
    return row;
}

function autoCollapseRow(settings) {
    const labels = AUTO_COLLAPSE_CHOICES.map(s => (s === 0 ? 'Off' : `${s} s`));
    const current = AUTO_COLLAPSE_CHOICES.indexOf(settings.get_int('auto-collapse-seconds'));
    const row = new Adw.ComboRow({
        title: 'Auto-collapse',
        subtitle: 'Collapse again after this long; paused while the pointer is on the top bar or a menu is open',
        model: Gtk.StringList.new(labels),
        selected: Math.max(0, current),
    });
    row.connect('notify::selected', () =>
        settings.set_int('auto-collapse-seconds', AUTO_COLLAPSE_CHOICES[row.selected]));
    return row;
}

function shortcutRow(window, settings, key, title) {
    const row = new Adw.ActionRow({title});
    const label = new Gtk.ShortcutLabel({
        disabled_text: 'Disabled',
        valign: Gtk.Align.CENTER,
    });
    const sync = () => {
        label.accelerator = settings.get_strv(key)[0] ?? '';
    };
    sync();
    settings.connect(`changed::${key}`, sync);

    const change = new Gtk.Button({label: 'Change…', valign: Gtk.Align.CENTER});
    change.connect('clicked', () => captureShortcut(window, title, accel =>
        settings.set_strv(key, accel ? [accel] : [])));

    row.add_suffix(label);
    row.add_suffix(change);
    return row;
}

// Small modal window that records the next key combination.
// Esc cancels, Backspace clears the shortcut.
function captureShortcut(parent, title, onDone) {
    const dialog = new Gtk.Window({
        transient_for: parent,
        modal: true,
        title,
        default_width: 360,
        default_height: 140,
        resizable: false,
    });
    dialog.set_child(new Gtk.Label({
        label: 'Press the new shortcut…\nEsc to cancel · Backspace to disable',
        justify: Gtk.Justification.CENTER,
        margin_top: 24, margin_bottom: 24, margin_start: 24, margin_end: 24,
    }));

    const controller = new Gtk.EventControllerKey();
    controller.connect('key-pressed', (_c, keyval, keycode, state) => {
        const mods = state & Gtk.accelerator_get_default_mod_mask();
        const lower = Gdk.keyval_to_lower(keyval);
        if (mods === 0 && lower === Gdk.KEY_Escape) {
            dialog.close();
            return Gdk.EVENT_STOP;
        }
        if (mods === 0 && lower === Gdk.KEY_BackSpace) {
            onDone(null);
            dialog.close();
            return Gdk.EVENT_STOP;
        }
        if (mods !== 0 && Gtk.accelerator_valid(lower, mods)) {
            onDone(Gtk.accelerator_name(lower, mods));
            dialog.close();
        }
        return Gdk.EVENT_STOP;
    });
    dialog.add_controller(controller);
    dialog.present();
}
