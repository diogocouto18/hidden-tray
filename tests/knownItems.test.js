import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeKnownItems, forgetItem, parseKnown, serializeKnown} from '../extension/lib/core/knownItems.js';

const T0 = '2026-11-17T10:00:00Z';
const T1 = '2026-11-18T10:00:00Z';

test('offline items keep their lastSeen; live items are refreshed and renamed', () => {
    const known = [
        {key: 'sni:artcraft-launcher', name: 'ArtCraft', lastSeen: T0},
        {key: 'sni:NetBird', name: 'NetBird old', lastSeen: T0},
    ];
    const merged = mergeKnownItems(known, [{key: 'sni:NetBird', name: 'NetBird'}], T1);
    assert.deepEqual(merged, [
        {key: 'sni:artcraft-launcher', name: 'ArtCraft', lastSeen: T0},
        {key: 'sni:NetBird', name: 'NetBird', lastSeen: T1},
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
});

test('forgetItem removes one key', () => {
    const list = [{key: 'a', name: 'A', lastSeen: T0}, {key: 'b', name: 'B', lastSeen: T0}];
    assert.deepEqual(forgetItem(list, 'a'), [{key: 'b', name: 'B', lastSeen: T0}]);
});

test('parseKnown tolerates garbage and round-trips with serializeKnown', () => {
    assert.deepEqual(parseKnown('garbage'), []);
    assert.deepEqual(parseKnown('{"a":1}'), []);
    const list = [{key: 'sni:NetBird', name: 'NetBird', lastSeen: T1}];
    assert.deepEqual(parseKnown(serializeKnown(list)), list);
});
