// Finds the tray icons created by the AppIndicator extensions and hides or shows
// their panel containers according to each icon's zone.
//
// Only status-area roles starting with "appindicator-" are touched. Visibility is
// set on the panel *container*; the AppIndicator extension manages the icon
// actor's own visibility (passive/ready), so the two never fight.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {resolveKeys, displayName} from '../core/identity.js';
import {Zone, isShown, zoneFor} from '../core/zones.js';
import {mergeKnownItems, parseKnown, serializeKnown} from '../core/knownItems.js';

const ROLE_PREFIX = 'appindicator-';
const KNOWN_WRITE_DELAY_S = 2;

export class TrayTracker {
    constructor({settings, onChanged}) {
        this._settings = settings;
        this._onChanged = onChanged;
        this._items = [];
        this._hidden = new Set();
        this._procs = new Map(); // busName -> {pid, exe} once resolved, null while pending
        this._readyHandlers = new Map(); // indicator -> handler id
        this._cancellable = new Gio.Cancellable();
        this._boxHandlers = [];
        this._knownTimer = 0;
        this._stopped = false;
    }

    start() {
        const box = Main.panel._rightBox;
        this._boxHandlers = [
            box.connect('child-added', () => this._rescan()),
            box.connect('child-removed', () => this._rescan()),
        ];
        this._rescan();
    }

    items() {
        return this._items;
    }

    hasManagedItems() {
        const zones = this._zones();
        const newItemZone = this._settings.get_string('new-item-zone');
        return this._items.some(item =>
            item.key !== null && zoneFor(item.key, zones, newItemZone) !== Zone.VISIBLE);
    }

    apply(state) {
        const zones = this._zones();
        const newItemZone = this._settings.get_string('new-item-zone');
        for (const {key, container} of this._items) {
            // An icon we can't identify yet is never hidden.
            const show = key === null || isShown(zoneFor(key, zones, newItemZone), state);
            if (!show) {
                container.hide();
                this._hidden.add(container);
            } else if (this._hidden.has(container)) {
                container.show();
                this._hidden.delete(container);
            }
        }
    }

    stop() {
        this._stopped = true;
        this._cancellable.cancel();
        const box = Main.panel._rightBox;
        for (const id of this._boxHandlers)
            box.disconnect(id);
        this._boxHandlers = [];
        for (const [indicator, id] of this._readyHandlers) {
            try {
                indicator.disconnect(id);
            } catch {
                // The indicator may already be gone.
            }
        }
        this._readyHandlers.clear();
        if (this._knownTimer) {
            GLib.source_remove(this._knownTimer);
            this._knownTimer = 0;
        }
        for (const container of this._hidden)
            container.show();
        this._hidden.clear();
        this._items = [];
    }

    _zones() {
        return this._settings.get_value('zones').deep_unpack();
    }

    _rescan() {
        if (this._stopped)
            return;
        const raw = [];
        for (const [role, statusIcon] of Object.entries(Main.panel.statusArea)) {
            if (!role.startsWith(ROLE_PREFIX) || !statusIcon?.container)
                continue;
            const indicator = statusIcon._indicator;
            if (indicator) {
                if (!indicator.id)
                    this._waitForReady(indicator);
                const proc = this._procFor(indicator.busName);
                raw.push({
                    uid: role, kind: 'sni', id: indicator.id, title: indicator.title,
                    pid: proc?.pid, exe: proc?.exe, container: statusIcon.container,
                });
            } else {
                const icon = statusIcon._icon;
                raw.push({
                    uid: role, kind: 'xembed', wmClass: icon?.wm_class, pid: icon?.pid,
                    container: statusIcon.container,
                });
            }
        }

        const keys = resolveKeys(raw);
        this._items = raw.map(r => ({
            role: r.uid, key: keys.get(r.uid), name: displayName(r), container: r.container,
        }));

        // Forget containers that left the panel (they may be destroyed).
        const live = new Set(this._items.map(i => i.container));
        for (const container of this._hidden) {
            if (!live.has(container))
                this._hidden.delete(container);
        }

        this._scheduleKnownWrite();
        this._onChanged();
    }

    _waitForReady(indicator) {
        if (this._readyHandlers.has(indicator))
            return;
        const id = indicator.connect('ready', () => {
            indicator.disconnect(id);
            this._readyHandlers.delete(indicator);
            this._rescan();
        });
        this._readyHandlers.set(indicator, id);
    }

    // Owning process of a D-Bus name, resolved asynchronously and cached.
    // Returns undefined until known (identity then treats the pid as unknown).
    _procFor(busName) {
        if (!busName)
            return undefined;
        if (this._procs.has(busName))
            return this._procs.get(busName) ?? undefined;
        this._procs.set(busName, null);
        Gio.DBus.session.call(
            'org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus',
            'GetConnectionUnixProcessID', new GLib.Variant('(s)', [busName]),
            new GLib.VariantType('(u)'), Gio.DBusCallFlags.NONE, -1, this._cancellable,
            (conn, res) => {
                let proc = {pid: undefined, exe: undefined};
                try {
                    const [pid] = conn.call_finish(res).deep_unpack();
                    let exe;
                    try {
                        exe = GLib.path_get_basename(GLib.file_read_link(`/proc/${pid}/exe`));
                    } catch {
                        exe = undefined;
                    }
                    proc = {pid, exe};
                } catch (e) {
                    if (e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        return;
                }
                this._procs.set(busName, proc);
                this._rescan();
            });
        return undefined;
    }

    _scheduleKnownWrite() {
        if (this._knownTimer)
            return;
        this._knownTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, KNOWN_WRITE_DELAY_S, () => {
            this._knownTimer = 0;
            const known = parseKnown(this._settings.get_string('known-items'));
            const live = this._items.map(i => ({key: i.key, name: i.name}));
            this._settings.set_string('known-items',
                serializeKnown(mergeKnownItems(known, live, new Date().toISOString())));
            return GLib.SOURCE_REMOVE;
        });
    }
}
