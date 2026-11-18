import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baseKey, resolveKeys, displayName, uniqueLabels} from '../extension/lib/core/identity.js';

test('uniqueLabels adds the key detail only to duplicated names', () => {
    const labels = uniqueLabels([
        {key: 'sni:NetBird', name: 'NetBird'},
        {key: 'sni:livepatch', name: 'update-notifier'},
        {key: 'sni:unattended-upgrade', name: 'update-notifier'},
        {key: 'sni:X#slack', name: 'X'},
        {key: 'sni:X#easyeffects', name: 'X'},
    ]);
    assert.equal(labels.get('sni:NetBird'), 'NetBird');
    assert.equal(labels.get('sni:livepatch'), 'update-notifier (livepatch)');
    assert.equal(labels.get('sni:unattended-upgrade'), 'update-notifier (unattended-upgrade)');
    assert.equal(labels.get('sni:X#slack'), 'X (X#slack)');
});

test('baseKey builds sni/xembed keys and returns null without an identifier', () => {
    assert.equal(baseKey({kind: 'sni', id: 'NetBird'}), 'sni:NetBird');
    assert.equal(baseKey({kind: 'xembed', wmClass: 'steam'}), 'xembed:steam');
    assert.equal(baseKey({kind: 'sni'}), null);
    assert.equal(baseKey({kind: 'sni', id: ''}), null);
});

test('same Id from the same process shares one key (Solaar double registration)', () => {
    const keys = resolveKeys([
        {uid: 'a', kind: 'sni', id: 'indicator-solaar', pid: 10},
        {uid: 'b', kind: 'sni', id: 'indicator-solaar', pid: 10},
    ]);
    assert.equal(keys.get('a'), 'sni:indicator-solaar');
    assert.equal(keys.get('b'), 'sni:indicator-solaar');
});

test('same Id from different processes is disambiguated by exe', () => {
    const keys = resolveKeys([
        {uid: 's', kind: 'sni', id: 'chrome_status_icon_1', pid: 1, exe: 'slack'},
        {uid: 'e', kind: 'sni', id: 'chrome_status_icon_1', pid: 2, exe: 'easyeffects'},
    ]);
    assert.equal(keys.get('s'), 'sni:chrome_status_icon_1#slack');
    assert.equal(keys.get('e'), 'sni:chrome_status_icon_1#easyeffects');
});

test('clash member with unknown exe stays unidentified (no session-specific pid keys)', () => {
    const keys = resolveKeys([
        {uid: 'x', kind: 'sni', id: 'X', pid: 7},
        {uid: 'y', kind: 'sni', id: 'X', pid: 8, exe: 'other'},
    ]);
    assert.equal(keys.get('x'), null);
    assert.equal(keys.get('y'), 'sni:X#other');
});

test('same Id while a pid is still unknown: the whole group stays unidentified', () => {
    const keys = resolveKeys([
        {uid: 'a', kind: 'sni', id: 'X', pid: 1, exe: 'slack'},
        {uid: 'b', kind: 'sni', id: 'X'},
    ]);
    assert.equal(keys.get('a'), null);
    assert.equal(keys.get('b'), null);
});

test('a single item never needs its pid', () => {
    const keys = resolveKeys([{uid: 'a', kind: 'sni', id: 'NetBird'}]);
    assert.equal(keys.get('a'), 'sni:NetBird');
});

test('unready item without Id resolves to null', () => {
    const keys = resolveKeys([{uid: 'u', kind: 'sni'}]);
    assert.equal(keys.get('u'), null);
});

test('displayName prefers a non-empty title, then id, then wmClass', () => {
    assert.equal(displayName({id: 'NetBird', title: ''}), 'NetBird');
    assert.equal(displayName({id: 'Zoho WorkDrive TrueSync', title: 'Zoho WorkDrive'}), 'Zoho WorkDrive');
    assert.equal(displayName({wmClass: 'steam'}), 'steam');
    assert.equal(displayName({}), 'Unknown');
});
