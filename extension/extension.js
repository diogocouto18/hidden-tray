// Hidden Tray: collapse chosen tray icons behind an arrow in the top bar.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ArrowButton} from './lib/shell/arrowButton.js';

export default class HiddenTrayExtension extends Extension {
    enable() {
        this._state = {expanded: false, revealAll: false};
        this._arrow = new ArrowButton({
            onPrimary: () => this._setExpanded(!this._state.expanded),
        });
        Main.panel.addToStatusArea(this.uuid, this._arrow, 0, 'right');
        this._sync();
    }

    disable() {
        this._arrow?.destroy();
        this._arrow = null;
        this._state = null;
    }

    _setExpanded(expanded) {
        this._state.expanded = expanded;
        if (!expanded)
            this._state.revealAll = false;
        this._sync();
    }

    _sync() {
        this._arrow.setState({expanded: this._state.expanded, dimmed: false});
    }
}
