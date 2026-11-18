// Stable identity keys for tray icons. Pure module: no gi:// imports.
//
// The AppIndicator extensions name each panel item after a per-session D-Bus id,
// so persistence uses the app-declared SNI Id instead. Two apps may declare the
// same Id; only then is the key suffixed with the owning executable.

export function baseKey(item) {
    if (item.kind === 'xembed')
        return item.wmClass ? `xembed:${item.wmClass}` : null;
    return item.id ? `sni:${item.id}` : null;
}

// Map uid -> key (or null when the item can't be identified yet).
export function resolveKeys(items) {
    const groups = new Map();
    for (const item of items) {
        const key = baseKey(item);
        if (key === null)
            continue;
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(item);
    }

    const result = new Map();
    for (const item of items)
        result.set(item.uid, null);

    for (const [key, members] of groups) {
        if (members.length === 1) {
            result.set(members[0].uid, key);
            continue;
        }
        // Several items share the Id. Until every pid is known we can't tell a
        // double registration (same process) from a clash, so keep them unidentified
        // (never hidden). In a clash, an item whose exe is unknown also stays
        // unidentified: a pid-based key would change every session.
        if (members.some(m => m.pid === undefined))
            continue;
        const clash = new Set(members.map(m => m.pid)).size > 1;
        for (const m of members) {
            if (!clash)
                result.set(m.uid, key);
            else if (m.exe)
                result.set(m.uid, `${key}#${m.exe}`);
        }
    }
    return result;
}

export function displayName(item) {
    return item.title || item.id || item.wmClass || 'Unknown';
}

// Map key -> label shown in menus/prefs. Names shared by several items get the
// key detail (without the "sni:"/"xembed:" prefix) appended, e.g.
// "update-notifier (livepatch)".
export function uniqueLabels(items) {
    const counts = new Map();
    for (const {name} of items)
        counts.set(name, (counts.get(name) ?? 0) + 1);
    const labels = new Map();
    for (const {key, name} of items) {
        const detail = key.slice(key.indexOf(':') + 1);
        labels.set(key, counts.get(name) > 1 ? `${name} (${detail})` : name);
    }
    return labels;
}
