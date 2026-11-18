import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Zone, isShown, zoneFor, isValidZone} from '../extension/lib/core/zones.js';

test('zone table', () => {
    const c = {expanded: false, revealAll: false};
    const e = {expanded: true, revealAll: false};
    const r = {expanded: true, revealAll: true};
    assert.deepEqual([c, e, r].map(s => isShown(Zone.VISIBLE, s)), [true, true, true]);
    assert.deepEqual([c, e, r].map(s => isShown(Zone.COLLAPSIBLE, s)), [false, true, true]);
    assert.deepEqual([c, e, r].map(s => isShown(Zone.ALWAYS_HIDDEN, s)), [false, false, true]);
    assert.equal(isShown('bogus', c), true);
});

test('zoneFor: stored, inherited, new-item default, fallback', () => {
    const zones = {'sni:NetBird': 'collapsible', 'sni:Foo': 'always-hidden', 'sni:Bad': 'nope'};
    assert.equal(zoneFor('sni:NetBird', zones, 'visible'), 'collapsible');
    assert.equal(zoneFor('sni:Foo#slack', zones, 'visible'), 'always-hidden');
    assert.equal(zoneFor('sni:New', zones, 'collapsible'), 'collapsible');
    assert.equal(zoneFor('sni:Bad', zones, 'bogus'), 'visible');
    assert.equal(isValidZone('always-hidden'), true);
    assert.equal(isValidZone('nope'), false);
});
