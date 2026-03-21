import { describe, it, expect } from 'vitest';
import { extractRecipeText } from '@/lib/utils/extractRecipeText';

describe('extractRecipeText', () => {
  it('returns visible text from simple HTML', () => {
    const html = '<html><body><p>Hello World</p></body></html>';
    expect(extractRecipeText(html)).toBe('Hello World');
  });

  it('strips script tags and their content', () => {
    const html =
      '<html><body><p>Visible</p><script>var x = 1;</script></body></html>';
    expect(extractRecipeText(html)).toBe('Visible');
  });

  it('strips style tags and their content', () => {
    const html =
      '<html><body><p>Text</p><style>.foo { color: red; }</style></body></html>';
    expect(extractRecipeText(html)).toBe('Text');
  });

  it('strips nav, footer, header, and aside elements', () => {
    const html = `<html><body>
      <nav>Nav content</nav>
      <header>Header</header>
      <p>Recipe content</p>
      <footer>Footer</footer>
      <aside>Sidebar</aside>
    </body></html>`;
    expect(extractRecipeText(html)).toBe('Recipe content');
  });

  it('strips noscript, iframe, and form elements', () => {
    const html = `<html><body>
      <noscript>Enable JS</noscript>
      <p>Content</p>
      <form><input type="text" /></form>
    </body></html>`;
    expect(extractRecipeText(html)).toBe('Content');
  });

  it('collapses multiple whitespace characters into single spaces', () => {
    const html = '<html><body><p>  Multiple   spaces  here  </p></body></html>';
    expect(extractRecipeText(html)).toBe('Multiple spaces here');
  });

  it('returns empty string for a body with no text', () => {
    const html = '<html><body></body></html>';
    expect(extractRecipeText(html)).toBe('');
  });

  it('returns empty string when all content is in noise elements', () => {
    const html =
      '<html><body><nav>Nav</nav><footer>Footer</footer></body></html>';
    expect(extractRecipeText(html)).toBe('');
  });
});
