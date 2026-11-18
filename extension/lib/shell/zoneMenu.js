// Right-click menu on the arrow: pick each live tray icon's zone.
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {uniqueLabels} from '../core/identity.js';
import {Zone, zoneFor} from '../core/zones.js';

const ZONE_LABELS = [
    [Zone.VISIBLE, 'Always visible'],
    [Zone.COLLAPSIBLE, 'Collapsible'],
    [Zone.ALWAYS_HIDDEN, 'Always hidden'],
];

export function buildZoneMenu(menu, items, zones, newItemZone, {onSetZone, onOpenPrefs}) {
    menu.removeAll();

    // One entry per identity key (e.g. Solaar's double registration shows once).
    const byKey = new Map();
    for (const item of items) {
        if (item.key !== null && !byKey.has(item.key))
            byKey.set(item.key, item);
    }
    const entries = [...byKey.values()];

    if (entries.length === 0) {
        menu.addMenuItem(new PopupMenu.PopupMenuItem(
            'No tray icons found — a tray (AppIndicator) extension must be enabled',
            {reactive: false}));
    } else {
        const labels = uniqueLabels(entries);
        entries.sort((a, b) => labels.get(a.key).localeCompare(labels.get(b.key), undefined, {sensitivity: 'base'}));
        for (const {key} of entries) {
            const current = zoneFor(key, zones, newItemZone);
            const sub = new PopupMenu.PopupSubMenuMenuItem(labels.get(key));
            for (const [zone, label] of ZONE_LABELS) {
                const choice = new PopupMenu.PopupMenuItem(label);
                choice.setOrnament(zone === current ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
                choice.connect('activate', () => onSetZone(key, zone));
                sub.menu.addMenuItem(choice);
            }
            menu.addMenuItem(sub);
        }
    }

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    const prefs = new PopupMenu.PopupMenuItem('Preferences…');
    prefs.connect('activate', () => onOpenPrefs());
    menu.addMenuItem(prefs);
}
