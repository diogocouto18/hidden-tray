import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AUTO_COLLAPSE_CHOICES, shouldCountDown} from '../extension/lib/core/autoCollapse.js';

const base = {expanded: true, seconds: 10, pointerInPanel: false, menuOpen: false};

test('choices match the spec (0 = off)', () => {
    assert.deepEqual(AUTO_COLLAPSE_CHOICES, [0, 5, 10, 15, 30, 60]);
});

test('counts down only when expanded, enabled, pointer away and no menu open', () => {
    assert.equal(shouldCountDown(base), true);
    assert.equal(shouldCountDown({...base, expanded: false}), false);
    assert.equal(shouldCountDown({...base, seconds: 0}), false);
    assert.equal(shouldCountDown({...base, pointerInPanel: true}), false);
    assert.equal(shouldCountDown({...base, menuOpen: true}), false);
});
