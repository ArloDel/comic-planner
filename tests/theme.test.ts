import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  nextToggleTheme,
  normalizeThemePreference,
  resolveTheme,
} from '../src/lib/theme.ts';

describe('theme helpers', () => {
  it('mengekspos kunci penyimpanan standar', () => {
    assert.equal(THEME_STORAGE_KEY, 'comicplan_theme');
  });

  it('menormalisasi preferensi tema tidak valid ke system', () => {
    assert.equal(normalizeThemePreference('light'), 'light');
    assert.equal(normalizeThemePreference('dark'), 'dark');
    assert.equal(normalizeThemePreference('system'), 'system');
    assert.equal(normalizeThemePreference(null), 'system');
    assert.equal(normalizeThemePreference(undefined), 'system');
    assert.equal(normalizeThemePreference('invalid'), 'system');
  });

  it('meresolusi tema berdasarkan preferensi eksplisit atau sistem', () => {
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('light', false), 'light');
    assert.equal(resolveTheme('dark', true), 'dark');
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('system', true), 'dark');
    assert.equal(resolveTheme('system', false), 'light');
  });

  it('membalik tema saat tombol toggle ditekan', () => {
    assert.equal(nextToggleTheme('light'), 'dark');
    assert.equal(nextToggleTheme('dark'), 'light');
  });
});
