import { docToPlainText } from './docText';

test('flattens page/paragraph/text into newline-joined plain text', () => {
  const doc = {
    type: 'doc',
    content: [{
      type: 'page',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
      ],
    }],
  };
  expect(docToPlainText(doc)).toBe('Hello world\nSecond line\n\n');
});

test('includes katex node formula text via attrs.latex', () => {
  const doc = {
    type: 'doc',
    content: [{
      type: 'page',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Area is ' },
          { type: 'katex', attrs: { latex: 'r^2\\pi' } },
        ],
      }],
    }],
  };
  expect(docToPlainText(doc)).toContain('Area is r^2\\pi');
});

test('empty/missing doc returns empty string', () => {
  expect(docToPlainText(null)).toBe('');
});
