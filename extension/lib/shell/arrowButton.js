// The Hidden Bar-style arrow in the top bar.
//
// GNOME 50 panel buttons use Clutter gestures. Never handle the legacy
// 'button-press-event' and return Clutter.EVENT_STOP: that leaves the click
// sequence unfinished and blocks global shortcuts (Super, Super+V).
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export const ArrowButton = GObject.registerClass(
class HiddenTrayArrowButton extends PanelMenu.Button {
    _init({onPrimary, onMiddle, onSecondary}) {
        // dontCreateMenu=true disables PanelMenu.Button's own primary-click gesture;
        // we attach a real menu (opened on right click only) before the button is
        // added to the panel, so the panel's menu manager registers it.
        super._init(0.0, 'Hidden Tray', true);
        this.setMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP));
        // setMenu() re-enables PanelMenu.Button's internal click gesture, which
        // recognizes on press, toggles the (still empty) menu and cancels our
        // gesture — every click looked dead. Disable it again, as the
        // AppIndicator extension does for its own panel buttons.
        this._clickGesture?.set_enabled(false);

        this._icon = new St.Icon({style_class: 'system-status-icon'});
        this.add_child(this._icon);

        // One ClickGesture for any button, dispatched on get_button(), as GNOME
        // Shell 50 itself does (e.g. ibusCandidatePopup).
        const handlers = new Map([
            [Clutter.BUTTON_PRIMARY, onPrimary],
            [Clutter.BUTTON_MIDDLE, onMiddle],
            [Clutter.BUTTON_SECONDARY, onSecondary ? () => {
                // Rebuild only when opening; closing just closes.
                if (!this.menu.isOpen)
                    onSecondary(this.menu);
                this.menu.toggle();
            } : null],
        ]);
        const gesture = new Clutter.ClickGesture();
        // A touch tap reports no mouse button (0): treat it as a primary click.
        gesture.connect('recognize', g => handlers.get(g.get_button() || Clutter.BUTTON_PRIMARY)?.());
        this.add_action(gesture);

        this.setState({expanded: false, dimmed: false});
    }

    setState({expanded, dimmed}) {
        // Expanded: "›" (click to collapse). Collapsed: "‹" (click to reveal).
        this._icon.icon_name = expanded ? 'pan-end-symbolic' : 'pan-start-symbolic';
        if (dimmed)
            this.add_style_class_name('hidden-tray-dimmed');
        else
            this.remove_style_class_name('hidden-tray-dimmed');
    }
});
