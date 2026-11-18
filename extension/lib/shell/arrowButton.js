// The Hidden Bar-style arrow in the top bar.
//
// GNOME 50 panel buttons use Clutter gestures. Never handle the legacy
// 'button-press-event' and return Clutter.EVENT_STOP: that leaves the click
// sequence unfinished and blocks global shortcuts (Super, Super+V).
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export const ArrowButton = GObject.registerClass(
class HiddenTrayArrowButton extends PanelMenu.Button {
    _init({onPrimary, onMiddle, onSecondary}) {
        super._init(0.0, 'Hidden Tray', true);

        this._icon = new St.Icon({style_class: 'system-status-icon'});
        this.add_child(this._icon);

        const handlers = [
            [Clutter.BUTTON_PRIMARY, onPrimary],
            [Clutter.BUTTON_MIDDLE, onMiddle],
            [Clutter.BUTTON_SECONDARY, onSecondary],
        ];
        for (const [button, handler] of handlers) {
            if (!handler)
                continue;
            const gesture = new Clutter.ClickGesture({required_button: button});
            gesture.connect('recognize', () => handler());
            this.add_action(gesture);
        }

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
