// Zone rules for tray icons. Pure module: no gi:// imports, unit-tested with node --test.

export const Zone = Object.freeze({
    VISIBLE: 'visible',
    COLLAPSIBLE: 'collapsible',
    ALWAYS_HIDDEN: 'always-hidden',
});

const VALID = new Set(Object.values(Zone));

export function isValidZone(value) {
    return VALID.has(value);
}

// Whether an icon in `zone` is shown for the given arrow state.
// Unknown zones are treated as visible so an icon is never lost.
export function isShown(zone, {expanded, revealAll}) {
    switch (zone) {
    case Zone.COLLAPSIBLE:
        return expanded || revealAll;
    case Zone.ALWAYS_HIDDEN:
        return revealAll;
    default:
        return true;
    }
}

// Zone for an identity key: stored value, else the stored value of the base key
// (keys suffixed with "#<exe>" inherit it), else the new-item zone, else visible.
export function zoneFor(key, zones, newItemZone) {
    if (isValidZone(zones[key]))
        return zones[key];
    const hash = key.indexOf('#');
    if (hash !== -1 && isValidZone(zones[key.slice(0, hash)]))
        return zones[key.slice(0, hash)];
    if (isValidZone(newItemZone))
        return newItemZone;
    return Zone.VISIBLE;
}
