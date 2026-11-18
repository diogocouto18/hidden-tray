// Shortcut validation. Pure module: no gi:// imports.

// A global shortcut must use Ctrl, Alt or Super. Shift alone (e.g. Shift+A)
// would capture ordinary typed text everywhere.
export function isAcceptableShortcut({control = false, alt = false, super: sup = false}) {
    return control || alt || sup;
}
