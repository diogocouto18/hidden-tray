// Auto-collapse policy. Pure module: no gi:// imports.

// Seconds; 0 means auto-collapse is off.
export const AUTO_COLLAPSE_CHOICES = [0, 5, 10, 15, 30, 60];

// The countdown runs only while expanded, enabled, with the pointer away from
// the panel and no tray/arrow menu open.
export function shouldCountDown({expanded, seconds, pointerInPanel, menuOpen}) {
    return expanded && seconds > 0 && !pointerInPanel && !menuOpen;
}
