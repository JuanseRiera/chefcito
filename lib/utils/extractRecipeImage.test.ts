import { describe, it, expect } from 'vitest';
import { extractRecipeImage } from '@/lib/utils/extractRecipeImage';

describe('extractRecipeImage', () => {
  // ----- og:image -----

  it('returns the og:image content URL', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/image.jpg">
    </head><body></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/image.jpg');
  });

  it('ignores og:image with a relative URL', () => {
    const html = `<html><head>
      <meta property="og:image" content="/relative/path.jpg">
    </head><body></body></html>`;
    expect(extractRecipeImage(html)).toBeNull();
  });

  it('ignores og:image with an empty content attribute', () => {
    const html = `<html><head>
      <meta property="og:image" content="">
    </head><body></body></html>`;
    expect(extractRecipeImage(html)).toBeNull();
  });

  // ----- JSON-LD: simple Recipe -----

  it('returns the image string from a JSON-LD Recipe object', () => {
    const ld = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Cake',
      image: 'https://example.com/cake.jpg',
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/cake.jpg');
  });

  it('returns the first element when JSON-LD image is an array of strings', () => {
    const ld = JSON.stringify({
      '@type': 'Recipe',
      image: [
        'https://example.com/cake-large.jpg',
        'https://example.com/cake-small.jpg',
      ],
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/cake-large.jpg');
  });

  it('returns the url property when JSON-LD image is an object', () => {
    const ld = JSON.stringify({
      '@type': 'Recipe',
      image: { '@type': 'ImageObject', url: 'https://example.com/cake.png' },
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/cake.png');
  });

  it('returns the url from the first array element when it is an ImageObject', () => {
    const ld = JSON.stringify({
      '@type': 'Recipe',
      image: [{ '@type': 'ImageObject', url: 'https://example.com/img.webp' }],
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/img.webp');
  });

  // ----- JSON-LD: @graph -----

  it('finds the Recipe inside a JSON-LD @graph array', () => {
    const ld = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'FoodBlog' },
        {
          '@type': 'Recipe',
          name: 'Cake',
          image: 'https://example.com/graph-cake.jpg',
        },
      ],
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/graph-cake.jpg');
  });

  // ----- og:image takes priority -----

  it('prefers og:image over JSON-LD when both are present', () => {
    const ld = JSON.stringify({
      '@type': 'Recipe',
      image: 'https://example.com/ld-image.jpg',
    });
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/og-image.jpg">
    </head><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/og-image.jpg');
  });

  // ----- no image -----

  it('returns null when there is no og:image and no JSON-LD', () => {
    const html = '<html><body><p>Just text</p></body></html>';
    expect(extractRecipeImage(html)).toBeNull();
  });

  it('returns null when JSON-LD type is not Recipe', () => {
    const ld = JSON.stringify({
      '@type': 'WebPage',
      image: 'https://example.com/not-a-recipe.jpg',
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBeNull();
  });

  it('returns null when JSON-LD Recipe has no image property', () => {
    const ld = JSON.stringify({ '@type': 'Recipe', name: 'Cake' });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBeNull();
  });

  // ----- resilience -----

  it('returns null and does not throw on malformed JSON-LD', () => {
    const html = `<html><body>
      <script type="application/ld+json">{ this is not valid json }</script>
    </body></html>`;
    expect(() => extractRecipeImage(html)).not.toThrow();
    expect(extractRecipeImage(html)).toBeNull();
  });

  it('returns null and does not throw on empty HTML string', () => {
    expect(() => extractRecipeImage('')).not.toThrow();
    expect(extractRecipeImage('')).toBeNull();
  });

  it('handles @type as an array containing Recipe', () => {
    const ld = JSON.stringify({
      '@type': ['Recipe', 'Thing'],
      image: 'https://example.com/multi-type.jpg',
    });
    const html = `<html><body><script type="application/ld+json">${ld}</script></body></html>`;
    expect(extractRecipeImage(html)).toBe('https://example.com/multi-type.jpg');
  });
});
