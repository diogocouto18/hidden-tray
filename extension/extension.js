// Hidden Tray: collapse chosen tray icons behind an arrow in the top bar.
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {shouldCountDown} from './lib/core/autoCollapse.js';
import {ArrowButton} from './lib/shell/arrowButton.js';
import {TrayTracker} from './lib/shell/trayTracker.js';
import {buildZoneMenu} from './lib/shell/zoneMenu.js';

export default class HiddenTrayExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._state = {expanded: false, revealAll: false};

        this._arrow = new ArrowButton({
            onPrimary: () => this._setExpanded(!this._state.expanded),
            onMiddle: () => this._reveal(),
            onSecondary: menu => buildZoneMenu(menu, this._tracker.items(), this._zones(),
                this._settings.get_string('new-item-zone'), {
                    onSetZone: (key, zone) => this._setZone(key, zone),
                    onOpenPrefs: () => this._openPrefs(),
                }),
        });
        Main.panel.addToStatusArea(this.uuid, this._arrow, 0, 'right');
        // The panel can destroy the arrow before disable() runs (e.g. at logout);
        // stop reacting to panel changes from then on.
        this._arrow.connectObject('destroy', () => {
            this._arrow = null; // already destroyed: disable() must not destroy it again
            this._teardown();
        }, this);

        this._tracker = new TrayTracker({
            settings: this._settings,
            onChanged: () => {
                this._anchorArrow();
                this._sync();
            },
        });
        this._settingsHandlers = ['zones', 'new-item-zone'].map(key =>
            this._settings.connect(`changed::${key}`, () => this._sync()));
        this._settingsHandlers.push(this._settings.connect('changed::auto-collapse-seconds',
            () => this._scheduleAutoCollapse()));

        // Shortcuts (GSettings keys, editable in prefs).
        const mode = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;
        Main.wm.addKeybinding('toggle-shortcut', this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            mode, () => this._setExpanded(!this._state.expanded));
        Main.wm.addKeybinding('reveal-shortcut', this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            mode, () => this._reveal());

        // Auto-collapse pauses while the pointer is over the panel. The panel does
        // not track hover by default; enable it and restore the old value on disable.
        this._panelHadTrackHover = Main.panel.track_hover;
        Main.panel.track_hover = true;
        Main.panel.connectObject('notify::hover', () => this._scheduleAutoCollapse(), this);
        this._collapseTimer = 0;

        this._tracker.start();
        this._sync();
    }

    disable() {
        this._teardown();
        Main.panel.disconnectObject(this);
        Main.panel.track_hover = this._panelHadTrackHover ?? false;
        Main.wm.removeKeybinding('toggle-shortcut');
        Main.wm.removeKeybinding('reveal-shortcut');
        for (const id of this._settingsHandlers ?? [])
            this._settings.disconnect(id);
        this._settingsHandlers = null;
        if (this._arrow) {
            this._arrow.disconnectObject(this);
            this._arrow.destroy();
            this._arrow = null;
        }
        this._settings = null;
        this._state = null;
    }

    // Stops everything that reacts to the panel. Safe to call twice: from the
    // arrow's 'destroy' (panel teardown) and from disable().
    _teardown() {
        this._cancelAutoCollapse();
        this._tracker?.stop();
        this._tracker = null;
    }

    _setExpanded(expanded) {
        this._state.expanded = expanded;
        if (!expanded)
            this._state.revealAll = false;
        this._sync();
        this._scheduleAutoCollapse();
    }

    _countdownState() {
        return {
            expanded: this._state.expanded,
            seconds: this._settings.get_int('auto-collapse-seconds'),
            pointerInPanel: Main.panel.hover,
            // activeMenu is undefined until the first menu opens, then null when closed.
            menuOpen: Boolean(Main.panel.menuManager.activeMenu),
        };
    }

    // (Re)start the countdown when it should run, cancel it otherwise. When it
    // fires while blocked (pointer on the panel or a menu open), it restarts.
    _scheduleAutoCollapse() {
        this._cancelAutoCollapse();
        if (!this._tracker)
            return; // torn down (panel destroyed or disabling)
        const state = this._countdownState();
        if (!shouldCountDown({...state, pointerInPanel: false, menuOpen: false}))
            return;
        if (state.pointerInPanel)
            return; // restarted by notify::hover when the pointer leaves
        this._collapseTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, state.seconds, () => {
            this._collapseTimer = 0;
            if (shouldCountDown(this._countdownState()))
                this._setExpanded(false);
            else
                this._scheduleAutoCollapse();
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelAutoCollapse() {
        if (this._collapseTimer) {
            GLib.source_remove(this._collapseTimer);
            this._collapseTimer = 0;
        }
    }

    _zones() {
        return this._settings.get_value('zones').deep_unpack();
    }

    // Writes one zone; the 'changed::zones' handler re-applies visibility.
    _setZone(key, zone) {
        const zones = {...this._zones(), [key]: zone};
        this._settings.set_value('zones', new GLib.Variant('a{ss}', zones));
    }

    _openPrefs() {
        try {
            this.openPreferences();
        } catch (e) {
            console.error(`[hidden-tray] cannot open preferences: ${e}`);
        }
    }

    // Middle click: show everything, including always-hidden icons, until the next collapse.
    _reveal() {
        this._state.expanded = true;
        this._state.revealAll = true;
        this._sync();
        this._scheduleAutoCollapse();
    }

    // Keep the arrow at the left end of the right box; other extensions
    // (e.g. Top Bar Organizer) may reorder it.
    _anchorArrow() {
        const box = Main.panel._rightBox;
        const container = this._arrow.container;
        if (container.get_parent() === box && box.get_child_at_index(0) !== container)
            box.set_child_at_index(container, 0);
    }

    _sync() {
        if (!this._tracker)
            return;
        this._tracker.apply(this._state);
        this._arrow.setState({
            expanded: this._state.expanded,
            dimmed: !this._tracker.hasManagedItems(),
        });
    }
}
