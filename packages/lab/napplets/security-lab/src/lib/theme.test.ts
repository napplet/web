import { describe, expect, it } from 'vitest';
import { themeToCssVariables, applyTheme } from './theme';

describe('themeToCssVariables', () => {
  it('maps the NAP-THEME colours and fonts', () => {
    expect(themeToCssVariables({
      colors: { background: '#101010', text: '#fafafa', primary: '#ff00aa' },
      fonts: { body: { name: 'Inter', url: 'x' }, title: { name: 'Fraunces', url: 'y' } },
    })).toEqual({
      '--lab-bg': '#101010',
      '--lab-text': '#fafafa',
      '--lab-accent': '#ff00aa',
      '--lab-font-body': '"Inter"',
      '--lab-font-title': '"Fraunces"',
    });
  });

  it('drops values that are not plain hex colours or safe font names', () => {
    expect(themeToCssVariables({
      colors: { background: 'url(javascript:alert(1))', text: 'red; --x: 1', primary: '#abc' },
      fonts: { body: { name: 'Evil"; background: url(x)', url: '' } },
    })).toEqual({ '--lab-accent': '#abc' });
  });

  it('returns nothing for a missing theme', () => {
    expect(themeToCssVariables(null)).toEqual({});
    expect(themeToCssVariables(undefined)).toEqual({});
  });
});

describe('applyTheme', () => {
  it('sets variables on the root and clears them when the theme goes away', () => {
    const root = document.createElement('div');
    applyTheme({ colors: { background: '#000000', text: '#ffffff', primary: '#00ff00' } }, root);
    expect(root.style.getPropertyValue('--lab-bg')).toBe('#000000');
    expect(root.style.getPropertyValue('--lab-accent')).toBe('#00ff00');
    applyTheme(null, root);
    expect(root.style.getPropertyValue('--lab-bg')).toBe('');
  });
});
