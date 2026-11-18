// Finds the tray icons created by the AppIndicator extensions and hides or shows
// their panel containers according to each icon's zone.
//
// Only status-area roles starting with "appindicator-" are touched. Visibility is
// set on the panel *container*; the AppIndicator extension manages the icon
// actor's own visibility (passive/ready), so the two never fight.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {resolveKeys, displayName} from '../core/identity.js';
import {Zone, isShown, zoneFor} from '../core/zones.js';
import {mergeKnownItems, parseKnown, serializeKnown} from '../core/knownItems.js';

const ROLE_PREFIX = 'appindicator-';

function panelBoxes() {
    return [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox];
}
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
        this._knownTimer = 0;
        this._rescanLater = 0;
        this._stopped = false;
    }

    // connectObject/disconnectObject (GNOME Shell's signal tracker) drop the
    // handlers automatically when the panel or a container is destroyed, e.g.
    // during logout, so we never disconnect an already-removed handler.
    // All three panel boxes are watched: the AppIndicator extension can put tray
    // icons on the left, center or right ('tray-pos').
    start() {
        for (const box of panelBoxes()) {
            box.connectObject(
                'child-added', () => this._queueRescan(),
                'child-removed', () => this._queueRescan(),
                this);
        }
        this._rescan();
    }

    // Coalesce rescans and run them before the next redraw. When a tray app
    // quits, its container is destroyed (child-removed) before the panel deletes
    // its statusArea entry; rescanning right away would keep the dying container.
    // Before-redraw still re-hides containers that another extension re-inserted
    // before they are painted.
    _queueRescan() {
        if (this._stopped || this._rescanLater)
            return;
        this._rescanLater = global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._rescanLater = 0;
            this._rescan();
            return GLib.SOURCE_REMOVE;
        });
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
        for (const {key, container, menu} of this._items) {
            // An icon we can't identify yet is never hidden.
            const show = key === null || isShown(zoneFor(key, zones, newItemZone), state);
            if (!show) {
                // Don't leave the icon's menu open on a hidden icon.
                if (menu?.isOpen)
                    menu.close();
                container.hide();
                if (!this._hidden.has(container)) {
                    this._hidden.add(container);
                    container.connectObject('destroy', () => this._hidden.delete(container), this);
                }
            } else if (this._hidden.has(container)) {
                container.disconnectObject(this);
                container.show();
                this._hidden.delete(container);
            }
        }
    }

    stop() {
        this._stopped = true;
        this._cancellable.cancel();
        if (this._rescanLater) {
            global.compositor.get_laters().remove(this._rescanLater);
            this._rescanLater = 0;
        }
        for (const box of panelBoxes())
            box.disconnectObject(this);
        for (const [indicator, ids] of this._readyHandlers) {
            for (const id of ids) {
                try {
                    indicator.disconnect(id);
                } catch {
                    // The indicator may already be gone.
                }
            }
        }
        this._readyHandlers.clear();
        if (this._knownTimer) {
            GLib.source_remove(this._knownTimer);
            this._knownTimer = 0;
        }
        // Destroyed containers already left _hidden through their 'destroy' handler.
        for (const container of this._hidden) {
            container.disconnectObject(this);
            container.show();
        }
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
            // Skip containers already detached from the panel (being destroyed).
            if (!role.startsWith(ROLE_PREFIX) || !statusIcon?.container?.get_parent())
                continue;
            const indicator = statusIcon._indicator;
            if (indicator) {
                if (!indicator.id)
                    this._waitForReady(indicator);
                const proc = this._procFor(indicator.busName);
                raw.push({
                    uid: role, kind: 'sni', id: indicator.id, title: indicator.title,
                    pid: proc?.pid, exe: proc?.exe, container: statusIcon.container,
                    menu: statusIcon.menu,
                });
            } else {
                const icon = statusIcon._icon;
                raw.push({
                    uid: role, kind: 'xembed', wmClass: icon?.wm_class, pid: icon?.pid,
                    container: statusIcon.container, menu: statusIcon.menu,
                });
            }
        }

        const keys = resolveKeys(raw);
        this._items = raw.map(r => ({
            role: r.uid, key: keys.get(r.uid), name: displayName(r), container: r.container,
            menu: r.menu,
        }));

        // Forget containers that left the panel (they may be destroyed).
        const live = new Set(this._items.map(i => i.container));
        for (const container of this._hidden) {
            if (!live.has(container)) {
                container.disconnectObject(this);
                this._hidden.delete(container);
            }
        }

        this._scheduleKnownWrite();
        this._onChanged();
    }

    // Rescan once the indicator knows its Id. If it is destroyed first, just drop
    // the handlers (AppIndicator emits 'destroy' before disconnecting everything).
    _waitForReady(indicator) {
        if (this._readyHandlers.has(indicator))
            return;
        const forget = () => {
            for (const id of this._readyHandlers.get(indicator) ?? [])
                indicator.disconnect(id);
            this._readyHandlers.delete(indicator);
        };
        const readyId = indicator.connect('ready', () => {
            forget();
            this._queueRescan();
        });
        const destroyId = indicator.connect('destroy', forget);
        this._readyHandlers.set(indicator, [readyId, destroyId]);
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
                this._queueRescan();
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
