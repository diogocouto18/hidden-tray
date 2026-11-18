// Hidden Tray: collapse chosen tray icons behind an arrow in the top bar.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ArrowButton} from './lib/shell/arrowButton.js';
import {TrayTracker} from './lib/shell/trayTracker.js';

export default class HiddenTrayExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._state = {expanded: false, revealAll: false};

        this._arrow = new ArrowButton({
            onPrimary: () => this._setExpanded(!this._state.expanded),
            onMiddle: () => this._reveal(),
        });
        Main.panel.addToStatusArea(this.uuid, this._arrow, 0, 'right');

        this._tracker = new TrayTracker({
            settings: this._settings,
            onChanged: () => {
                this._anchorArrow();
                this._sync();
            },
        });
        this._settingsHandlers = ['zones', 'new-item-zone'].map(key =>
            this._settings.connect(`changed::${key}`, () => this._sync()));

        this._tracker.start();
        this._sync();
    }

    disable() {
        for (const id of this._settingsHandlers ?? [])
            this._settings.disconnect(id);
        this._settingsHandlers = null;
        this._tracker?.stop();
        this._tracker = null;
        this._arrow?.destroy();
        this._arrow = null;
        this._settings = null;
        this._state = null;
    }

    _setExpanded(expanded) {
        this._state.expanded = expanded;
        if (!expanded)
            this._state.revealAll = false;
        this._sync();
    }

    // Middle click: show everything, including always-hidden icons, until the next collapse.
    _reveal() {
        this._state.expanded = true;
        this._state.revealAll = true;
        this._sync();
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
