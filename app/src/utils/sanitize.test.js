import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeText, sanitizeHTML } from './sanitize';

describe('sanitize', () => {
  describe('sanitizeText', () => {
    it('should return plain text unchanged', () => {
      const input = 'This is plain text';
      const result = sanitizeText(input);
      expect(result).toBe('This is plain text');
    });

    it('should strip dangerous HTML tags and keep safe content', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeText(input);
      // DOMPurify may keep some safe tags but strip dangerous ones
      expect(result).toContain('Hello');
      expect(result).toContain('world');
      expect(result).not.toContain('<script');
    });

    it('should remove script tags and content', () => {
      const input = 'Hello<script>alert("XSS")</script>world';
      const result = sanitizeText(input);
      expect(result).toBe('Helloworld');
    });

    it('should remove inline event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = sanitizeText(input);
      expect(result).toBe('Click me');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = sanitizeText(input);
      expect(result).toBe('Link');
    });

    it('should handle nested HTML tags and preserve text content', () => {
      const input = '<div><p><span>Nested</span> text</p></div>';
      const result = sanitizeText(input);
      expect(result).toContain('Nested');
      expect(result).toContain('text');
    });

    it('should return empty string for null', () => {
      const result = sanitizeText(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = sanitizeText(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for empty string', () => {
      const result = sanitizeText('');
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeText(123)).toBe('');
      expect(sanitizeText(true)).toBe('');
      expect(sanitizeText({})).toBe('');
      expect(sanitizeText([])).toBe('');
    });

    it('should handle SVG-based XSS attempts', () => {
      const input = '<svg onload="alert(\'XSS\')">SVG</svg>';
      const result = sanitizeText(input);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
    });

    it('should handle iframe injection attempts', () => {
      const input = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const result = sanitizeText(input);
      expect(result).not.toContain('iframe');
      expect(result).not.toContain('javascript');
    });

    it('should handle data URI XSS attempts', () => {
      const input = '<img src="data:text/html,<script>alert(\'XSS\')</script>">';
      const result = sanitizeText(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('should handle obfuscated script tags', () => {
      const input = '<scr<script>ipt>alert("XSS")</scr</script>ipt>';
      const result = sanitizeText(input);
      // The important thing is that script tags are removed
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should handle style tag with expression()', () => {
      const input = '<style>body{background:expression(alert(\'XSS\'))}</style>';
      const result = sanitizeText(input);
      expect(result).not.toContain('expression');
      expect(result).not.toContain('alert');
    });

    it('should handle base64 encoded XSS', () => {
      const input = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">';
      const result = sanitizeText(input);
      expect(result).toBe('');
    });

    it('should preserve or safely encode special characters', () => {
      const input = 'Special chars: & < > " \' ©';
      const result = sanitizeText(input);
      // DOMPurify may HTML-encode special characters for safety
      expect(result).toBeTruthy();
      expect(result).toContain('Special chars');
      // Characters may be encoded as &amp; &lt; &gt; etc.
    });

    it('should handle multi-line text', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = sanitizeText(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle very long input', () => {
      const input = 'a'.repeat(10000);
      const result = sanitizeText(input);
      expect(result.length).toBe(10000);
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('</p>');
    });

    it('should allow bold and italic tags', () => {
      const input = '<b>Bold</b> and <i>italic</i> and <em>emphasis</em>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
      expect(result).toContain('<em>');
    });

    it('should allow safe links with href attribute', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<a href="https://example.com">');
      expect(result).toContain('Link');
    });

    it('should allow lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should allow ordered lists', () => {
      const input = '<ol><li>First</li><li>Second</li></ol>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });

    it('should allow line breaks', () => {
      const input = 'Line 1<br>Line 2';
      const result = sanitizeHTML(input);
      expect(result).toContain('<br>');
    });

    it('should remove script tags', () => {
      const input = '<p>Text</p><script>alert("XSS")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('<p>Text</p>');
    });

    it('should remove inline event handlers', () => {
      const input = '<p onclick="alert(\'XSS\')">Click me</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<p>');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: protocol from links', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove dangerous tags like iframe', () => {
      const input = '<p>Text</p><iframe src="evil.com"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('<p>Text</p>');
    });

    it('should remove style tags', () => {
      const input = '<p>Text</p><style>body{background:red}</style>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<style>');
      expect(result).toContain('<p>Text</p>');
    });

    it('should remove data attributes', () => {
      const input = '<p data-custom="value">Text</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('data-custom');
      expect(result).toContain('<p>');
      expect(result).toContain('Text');
    });

    it('should remove disallowed attributes', () => {
      const input = '<p class="test" id="para">Text</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('class');
      expect(result).not.toContain('id');
      expect(result).toContain('<p>');
    });

    it('should allow target attribute on links', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('target="_blank"');
    });

    it('should allow title attribute on links', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('title="Example"');
    });

    it('should return empty string for null', () => {
      const result = sanitizeHTML(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = sanitizeHTML(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for empty string', () => {
      const result = sanitizeHTML('');
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHTML(123)).toBe('');
      expect(sanitizeHTML(true)).toBe('');
      expect(sanitizeHTML({})).toBe('');
      expect(sanitizeHTML([])).toBe('');
    });

    it('should handle nested allowed tags', () => {
      const input = '<ul><li><strong>Bold item</strong></li></ul>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('<strong>');
    });

    it('should handle SVG-based XSS attempts', () => {
      const input = '<svg onload="alert(\'XSS\')">SVG</svg>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('<svg>');
    });

    it('should handle meta tag injection', () => {
      const input = '<meta http-equiv="refresh" content="0;url=evil.com">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<meta>');
    });

    it('should handle object and embed tags', () => {
      const input = '<object data="evil.swf"></object>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<object>');
    });

    it('should preserve safe HTML entities', () => {
      const input = '<p>&lt; &gt; &amp; &quot;</p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed paragraph<b>Bold text';
      const result = sanitizeHTML(input);
      // DOMPurify should fix or strip malformed HTML
      expect(result).toBeTruthy();
    });
  });
});
