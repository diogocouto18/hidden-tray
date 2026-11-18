import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isAcceptableShortcut} from '../extension/lib/core/shortcuts.js';

test('a global shortcut needs Ctrl, Alt or Super', () => {
    assert.equal(isAcceptableShortcut({super: true, alt: true}), true);
    assert.equal(isAcceptableShortcut({control: true}), true);
    assert.equal(isAcceptableShortcut({alt: true, shift: true}), true);
});

test('Shift alone or no modifier is rejected (it would swallow typed text)', () => {
    assert.equal(isAcceptableShortcut({shift: true}), false);
    assert.equal(isAcceptableShortcut({}), false);
});
