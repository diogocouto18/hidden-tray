import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeKnownItems, forgetItem, parseKnown, serializeKnown} from '../extension/lib/core/knownItems.js';

const T0 = '2026-11-17T10:00:00Z';
const T1 = '2026-11-18T10:00:00Z';

test('offline items keep their lastSeen; live items are refreshed, renamed and marked running', () => {
    const known = [
        {key: 'sni:artcraft-launcher', name: 'ArtCraft', lastSeen: T0, running: true},
        {key: 'sni:NetBird', name: 'NetBird old', lastSeen: T0, running: false},
    ];
    const merged = mergeKnownItems(known, [{key: 'sni:NetBird', name: 'NetBird'}], T1);
    assert.deepEqual(merged, [
        {key: 'sni:artcraft-launcher', name: 'ArtCraft', lastSeen: T0, running: false},
        {key: 'sni:NetBird', name: 'NetBird', lastSeen: T1, running: true},
    ]);
});

test('null keys are ignored and the result is sorted case-insensitively by name', () => {
    const merged = mergeKnownItems([], [
        {key: 'sni:indicator-solaar', name: 'solaar'},
        {key: null, name: 'Unready'},
        {key: 'sni:NetBird', name: 'NetBird'},
        {key: 'sni:artcraft-launcher', name: 'ArtCraft'},
    ], T1);
    assert.deepEqual(merged.map(i => i.name), ['ArtCraft', 'NetBird', 'solaar']);
    assert.ok(merged.every(i => i.running));
});

test('forgetItem removes one key', () => {
    const list = [{key: 'a', name: 'A', lastSeen: T0}, {key: 'b', name: 'B', lastSeen: T0}];
    assert.deepEqual(forgetItem(list, 'a'), [{key: 'b', name: 'B', lastSeen: T0}]);
});

test('parseKnown tolerates garbage and round-trips with serializeKnown', () => {
    assert.deepEqual(parseKnown('garbage'), []);
    assert.deepEqual(parseKnown('{"a":1}'), []);
    const list = [{key: 'sni:NetBird', name: 'NetBird', lastSeen: T1, running: true}];
    assert.deepEqual(parseKnown(serializeKnown(list)), list);
});

test('parseKnown drops malformed entries so a corrupted value cannot break merging', () => {
    const json = JSON.stringify([
        {key: 'sni:ok', name: 'OK', lastSeen: T0},
        {key: 'sni:noname'},
        {name: 'nokey'},
        null,
        42,
        {key: 5, name: 'numeric key'},
    ]);
    assert.deepEqual(parseKnown(json), [{key: 'sni:ok', name: 'OK', lastSeen: T0}]);
    assert.doesNotThrow(() => mergeKnownItems(parseKnown(json), [{key: 'sni:x', name: 'X'}], T1));
});
