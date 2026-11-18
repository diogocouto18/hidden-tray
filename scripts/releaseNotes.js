// Release notes from CHANGELOG.md: the section for one version plus a standard
// install footer. Used by the release workflow:
//   node scripts/releaseNotes.js v1.2.3 > notes.md
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Body under "## <version>" (heading may continue with " — date"), up to the
// next "## " heading. Returns null when the version has no section.
export function extractSection(changelog, version) {
    const v = version.replace(/^v/, '');
    const heading = new RegExp(`^## ${escapeRegExp(v)}(?:\\s|$).*$`, 'm');
    const match = heading.exec(changelog);
    if (!match)
        return null;
    const rest = changelog.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    return (next === -1 ? rest : rest.slice(0, next)).trim();
}

export function buildReleaseNotes(changelog, version, zipName, uuid) {
    const section = extractSection(changelog, version);
    if (!section)
        throw new Error(`No CHANGELOG.md section for ${version.replace(/^v/, '')}`);
    return `${section}

### Install

Requires GNOME Shell 50 and a tray (AppIndicator) extension, such as Ubuntu's built-in *Ubuntu AppIndicators*.

\`\`\`bash
gnome-extensions install --force ${zipName}
\`\`\`

Log out and back in once (Wayland loads new extensions at login), then:

\`\`\`bash
gnome-extensions enable ${uuid}
\`\`\`

Upgrading: install the new zip the same way and log out and back in once.
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const version = process.argv[2];
    if (!version) {
        console.error('usage: node scripts/releaseNotes.js <version>');
        process.exit(2);
    }
    const root = new URL('..', import.meta.url);
    const {uuid} = JSON.parse(readFileSync(new URL('extension/metadata.json', root), 'utf8'));
    const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');
    try {
        process.stdout.write(buildReleaseNotes(changelog, version, `${uuid}.shell-extension.zip`, uuid));
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
