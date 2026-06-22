import React from 'react';

export const PAGE_SIZES = {
  letter: { label: 'US Letter (8.5 × 11 in)', width: '8.5in', height: '11in', heightPx: 1056 },
  a4:     { label: 'A4 (8.27 × 11.69 in)',    width: '8.27in', height: '11.69in', heightPx: 1122 },
};

export const DEFAULT_PAGE_SETTINGS = {
  pageSize:    'letter',
  marginTop:    1,
  marginBottom: 1,
  marginLeft:   1,
  marginRight:  1,
  fontSize:    12,
  lineSpacing:  1.5,
  columns:      1,
};

export const PRESETS = [
  {
    key: 'default',
    label: 'Default',
    s: { pageSize: 'letter', marginTop: 1, marginBottom: 1, marginLeft: 1, marginRight: 1, fontSize: 12, lineSpacing: 1.5, columns: 1 },
  },
  {
    key: 'ieee',
    label: 'IEEE',
    s: { pageSize: 'letter', marginTop: 0.75, marginBottom: 1, marginLeft: 0.65, marginRight: 0.65, fontSize: 10, lineSpacing: 1, columns: 2 },
  },
  {
    key: 'acm',
    label: 'ACM',
    s: { pageSize: 'letter', marginTop: 1, marginBottom: 1.18, marginLeft: 0.9, marginRight: 0.9, fontSize: 9, lineSpacing: 1.15, columns: 2 },
  },
  {
    key: 'thesis',
    label: 'Thesis',
    s: { pageSize: 'letter', marginTop: 1, marginBottom: 1, marginLeft: 1.5, marginRight: 1, fontSize: 12, lineSpacing: 2, columns: 1 },
  },
  {
    key: 'a4',
    label: 'A4',
    s: { pageSize: 'a4', marginTop: 1, marginBottom: 1, marginLeft: 1.18, marginRight: 0.9, fontSize: 11, lineSpacing: 1.5, columns: 1 },
  },
];

const NumInput = ({ value, onChange, min, max, step, unit }) => (
  <div className="ps-num-wrap">
    <input
      type="number"
      className="ps-num-input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    />
    {unit && <span className="ps-unit">{unit}</span>}
  </div>
);

const PageSettingsModal = ({ settings, onChange, onClose, soundSettings, onSoundChange }) => {
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <div className="ps-backdrop" onClick={onClose}>
      <div className="ps-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-header">
          <h3>Page Settings</h3>
          <button className="ps-close" onClick={onClose}>✕</button>
        </div>

        <div className="ps-body">
          {/* ── Presets ── */}
          <section className="ps-section">
            <div className="ps-section-label">Templates</div>
            <div className="ps-presets">
              {PRESETS.map(({ key, label, s }) => (
                <button
                  key={key}
                  className="ps-preset-btn"
                  onClick={() => onChange(s)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Page size ── */}
          <section className="ps-section">
            <div className="ps-section-label">Page Size</div>
            <select
              className="ps-select"
              value={settings.pageSize}
              onChange={e => set('pageSize', e.target.value)}
            >
              {Object.entries(PAGE_SIZES).map(([k, { label }]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </section>

          {/* ── Margins ── */}
          <section className="ps-section">
            <div className="ps-section-label">Margins (inches)</div>
            <div className="ps-margins">
              <div className="ps-margins-top">
                <NumInput value={settings.marginTop}    onChange={v => set('marginTop', v)}    min={0.25} max={3} step={0.05} unit="Top" />
              </div>
              <div className="ps-margins-middle">
                <NumInput value={settings.marginLeft}   onChange={v => set('marginLeft', v)}   min={0.25} max={3} step={0.05} unit="Left" />
                <div className="ps-margins-page-icon" title={`${PAGE_SIZES[settings.pageSize].label}`}>
                  <div className="ps-page-thumb" />
                </div>
                <NumInput value={settings.marginRight}  onChange={v => set('marginRight', v)}  min={0.25} max={3} step={0.05} unit="Right" />
              </div>
              <div className="ps-margins-bottom">
                <NumInput value={settings.marginBottom} onChange={v => set('marginBottom', v)} min={0.25} max={3} step={0.05} unit="Bottom" />
              </div>
            </div>
          </section>

          {/* ── Typography ── */}
          <section className="ps-section">
            <div className="ps-section-label">Typography</div>
            <div className="ps-typo-row">
              <span>Font Size</span>
              <NumInput value={settings.fontSize}    onChange={v => set('fontSize', v)}    min={6} max={24} step={1} unit="pt" />
            </div>
            <div className="ps-typo-row">
              <span>Line Spacing</span>
              <NumInput value={settings.lineSpacing} onChange={v => set('lineSpacing', v)} min={1} max={3} step={0.25} unit="×" />
            </div>
          </section>

          {/* ── Columns ── */}
          <section className="ps-section">
            <div className="ps-section-label">Layout</div>
            <div className="ps-columns-toggle">
              {[1, 2].map(n => (
                <button
                  key={n}
                  className={`ps-col-btn${settings.columns === n ? ' active' : ''}`}
                  onClick={() => set('columns', n)}
                  title={n === 1 ? 'Single column' : 'Two columns (IEEE / ACM style)'}
                >
                  <div className={`ps-col-icon ps-col-icon-${n}`}>
                    {n === 1
                      ? <div className="ps-col-bar" />
                      : <><div className="ps-col-bar" /><div className="ps-col-bar" /></>
                    }
                  </div>
                  <span>{n === 1 ? 'Single' : 'Two Column'}</span>
                </button>
              ))}
            </div>
            {settings.columns === 2 && (
              <p className="ps-col-hint">
                Use the <strong>⊞ Span</strong> toolbar button to make a heading or title stretch across both columns.
              </p>
            )}
          </section>

          {/* ── Sound ── */}
          {soundSettings && (
            <section className="ps-section">
              <div className="ps-section-label">Sound Effects</div>
              <div className="ps-sound-row">
                <span className="ps-sound-label">Enabled</span>
                <button
                  className={`ps-sound-toggle${soundSettings.enabled ? ' active' : ''}`}
                  onClick={() => onSoundChange({ ...soundSettings, enabled: !soundSettings.enabled })}
                  aria-pressed={soundSettings.enabled}
                >
                  {soundSettings.enabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="ps-sound-row">
                <span className="ps-sound-label">Volume</span>
                <div className="ps-sound-vol-wrap">
                  <input
                    type="range"
                    className="ps-sound-slider"
                    min={0}
                    max={100}
                    value={Math.round(soundSettings.volume * 100)}
                    onChange={e => onSoundChange({ ...soundSettings, volume: parseInt(e.target.value, 10) / 100 })}
                    disabled={!soundSettings.enabled}
                  />
                  <span className="ps-sound-vol-label">{Math.round(soundSettings.volume * 100)}%</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="ps-footer">
          <button className="ps-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default PageSettingsModal;
