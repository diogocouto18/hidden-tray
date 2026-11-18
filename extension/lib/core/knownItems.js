// Known tray items, published by the shell so the prefs process can list them.
// Pure module: no gi:// imports.

// Union of `known` and `live` by key. Live items get `nowIso`, their current
// name and running: true; offline items keep their name/lastSeen with
// running: false. Items without a key are ignored.
export function mergeKnownItems(known, live, nowIso) {
    const byKey = new Map();
    for (const item of known) {
        if (item.key)
            byKey.set(item.key, {key: item.key, name: item.name, lastSeen: item.lastSeen, running: false});
    }
    for (const item of live) {
        if (item.key)
            byKey.set(item.key, {key: item.key, name: item.name, lastSeen: nowIso, running: true});
    }
    return [...byKey.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));
}

export function forgetItem(known, key) {
    return known.filter(item => item.key !== key);
}

// Parses the stored list, keeping only well-formed entries (string key and name).
export function parseKnown(json) {
    let value;
    try {
        value = JSON.parse(json);
    } catch {
        return [];
    }
    if (!Array.isArray(value))
        return [];
    return value.filter(item =>
        item !== null && typeof item === 'object' &&
        typeof item.key === 'string' && typeof item.name === 'string');
}

export function serializeKnown(list) {
    return JSON.stringify(list);
}
