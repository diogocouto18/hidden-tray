// Known tray items, published by the shell so the prefs process can list them.
// Pure module: no gi:// imports.

// Union of `known` and `live` by key. Live items get `nowIso` and their current
// name; offline items keep what they had. Items without a key are ignored.
export function mergeKnownItems(known, live, nowIso) {
    const byKey = new Map();
    for (const item of known) {
        if (item.key)
            byKey.set(item.key, {key: item.key, name: item.name, lastSeen: item.lastSeen});
    }
    for (const item of live) {
        if (item.key)
            byKey.set(item.key, {key: item.key, name: item.name, lastSeen: nowIso});
    }
    return [...byKey.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));
}

export function forgetItem(known, key) {
    return known.filter(item => item.key !== key);
}

export function parseKnown(json) {
    try {
        const value = JSON.parse(json);
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

export function serializeKnown(list) {
    return JSON.stringify(list);
}
