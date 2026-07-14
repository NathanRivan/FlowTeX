import { computeEquationMarker, dismissWarning } from './equationValidation';

function setRegistries({ bibKeys = [], labelDefs = [] } = {}) {
  window.flumenwriteBibKeys = new Set(bibKeys);
  window.flumenwriteLabelDefs = new Set(labelDefs);
}

afterEach(() => {
  delete window.flumenwriteBibKeys;
  delete window.flumenwriteLabelDefs;
});

describe('computeEquationMarker — valid cases', () => {
  test('plain valid equation, no registries needed', () => {
    expect(computeEquationMarker('x^2 + y^2 = z^2')).toBeNull();
  });

  test('\\cite with a key that resolves', () => {
    setRegistries({ bibKeys: ['smith2020'] });
    expect(computeEquationMarker(String.raw`\text{see }\cite{smith2020}`)).toBeNull();
  });

  test('\\ref with a label that resolves', () => {
    setRegistries({ labelDefs: ['eq:1'] });
    expect(computeEquationMarker(String.raw`x = y \quad \eqref{eq:1}`)).toBeNull();
  });
});

describe('computeEquationMarker — invalid cases', () => {
  test('genuine KaTeX syntax error is a hard error', () => {
    const marker = computeEquationMarker(String.raw`\frac{1}{2`);
    expect(marker.severity).toBe('error');
    expect(marker.message.length).toBeGreaterThan(0);
  });

  test('missing bibliography key names the key', () => {
    setRegistries({ bibKeys: ['other2019'] });
    const marker = computeEquationMarker(String.raw`\cite{smith2020}`);
    expect(marker.severity).toBe('error');
    expect(marker.message).toContain('smith2020');
  });

  test('missing label names the label', () => {
    setRegistries({ labelDefs: [] });
    const marker = computeEquationMarker(String.raw`\ref{eq:missing}`);
    expect(marker.severity).toBe('error');
    expect(marker.message).toContain('eq:missing');
  });
});

describe('computeEquationMarker — edge cases', () => {
  test('multi-key \\cite with a mix of valid and invalid keys names only the invalid ones', () => {
    setRegistries({ bibKeys: ['ok2020'] });
    const marker = computeEquationMarker(String.raw`\cite{ok2020,missing2021,alsoMissing}`);
    expect(marker.severity).toBe('error');
    expect(marker.message).toContain('missing2021');
    expect(marker.message).toContain('alsoMissing');
    expect(marker.message).not.toContain('ok2020');
  });

  test('unsupported-macro KaTeX warning is dismissible and stays hidden once dismissed', () => {
    const latex = String.raw`\SI{5}{\meter}`;
    const marker = computeEquationMarker(latex);
    expect(marker.severity).toBe('warning');
    expect(marker.dismissKey).toBeTruthy();

    dismissWarning(marker.dismissKey);
    expect(computeEquationMarker(latex)).toBeNull();
  });

  test('a real error alongside a dismissed warning still surfaces (dismiss does not hide unrelated errors)', () => {
    setRegistries({ bibKeys: [] });
    const latex = String.raw`\SI{5}{\meter} \cite{missing}`;
    const first = computeEquationMarker(latex);
    // With two simultaneous issues, no dismiss control is offered at all —
    // dismissing must never be able to hide a real error alongside it.
    expect(first.dismissKey).toBeNull();
    expect(first.severity).toBe('error');
    expect(first.message).toContain('missing');
  });
});
