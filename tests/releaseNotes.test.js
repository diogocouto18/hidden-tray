import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractSection, buildReleaseNotes} from '../scripts/releaseNotes.js';

const CHANGELOG = `# Changelog

Intro text.

## 1.1.0 — 2026-12-01

### What's new
- Something new.

## 1.0.0 — 2026-11-18

### What's new
- First release.
`;

test('extractSection returns the body under the matching version heading', () => {
    assert.equal(extractSection(CHANGELOG, '1.1.0'), "### What's new\n- Something new.");
    assert.equal(extractSection(CHANGELOG, '1.0.0'), "### What's new\n- First release.");
});

test('extractSection accepts a leading v and returns null for unknown versions', () => {
    assert.equal(extractSection(CHANGELOG, 'v1.0.0'), "### What's new\n- First release.");
    assert.equal(extractSection(CHANGELOG, '2.0.0'), null);
    assert.equal(extractSection(CHANGELOG, '1.0'), null);
});

test('buildReleaseNotes appends the install footer with the zip name', () => {
    const notes = buildReleaseNotes(CHANGELOG, '1.0.0', 'hidden-tray@x.shell-extension.zip', 'hidden-tray@x');
    assert.match(notes, /^### What's new\n- First release\.\n/);
    assert.match(notes, /gnome-extensions install --force hidden-tray@x\.shell-extension\.zip/);
    assert.match(notes, /gnome-extensions enable hidden-tray@x/);
});

test('buildReleaseNotes throws when the changelog has no section for the version', () => {
    assert.throws(() => buildReleaseNotes(CHANGELOG, '9.9.9', 'z.zip', 'u'), /No CHANGELOG\.md section for 9\.9\.9/);
});
