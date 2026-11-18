import js from '@eslint/js';
import globals from 'globals';

export default [
    {ignores: ['node_modules/', 'dist/', '.superpowers/', '.local-backup/']},
    js.configs.recommended,
    {
        files: ['extension/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            // GJS runtime globals available inside GNOME Shell and prefs.
            globals: {console: 'readonly', TextDecoder: 'readonly', TextEncoder: 'readonly', globalThis: 'readonly', global: 'readonly'},
        },
    },
    {
        files: ['tests/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
        languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.node},
    },
];
