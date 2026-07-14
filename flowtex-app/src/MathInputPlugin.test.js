import { scanOpenMathZone } from './MathInputPlugin';

test('no dollar signs: no open zone', () => {
  expect(scanOpenMathZone('just some text')).toBeNull();
});

test('unclosed single $ is open', () => {
  expect(scanOpenMathZone('a $x')).toEqual({ openAt: 2, latex: 'x' });
});

test('closed single $..$ pair is not open', () => {
  expect(scanOpenMathZone('a $x$ b')).toBeNull();
});

test('text after a closed $..$ pair does not reopen a zone (regression)', () => {
  expect(scanOpenMathZone('Type math inline with $x$, or start a new line')).toBeNull();
});

test('unclosed $$ is open', () => {
  expect(scanOpenMathZone('a $$ for display')).toEqual({ openAt: 2, latex: ' for display' });
});

test('closed $$..$$ pair is not open', () => {
  expect(scanOpenMathZone('$$E=mc^2$$ done')).toBeNull();
});
