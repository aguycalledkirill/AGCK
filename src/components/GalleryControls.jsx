import { useEffect, useState } from 'react';
import { SETTINGS_SECTIONS, isMobileViewport } from '../gallery/settings';
import './GalleryControls.css';

function FieldControl({ field, value, onChange }) {
  if (field.type === 'toggle') {
    return (
      <label className="gc-field gc-field-toggle">
        <span>{field.label}</span>
        <button
          type="button"
          className={`gc-toggle ${value ? 'is-on' : ''}`}
          aria-pressed={Boolean(value)}
          onClick={() => onChange(field.key, !value)}
        >
          <span className="gc-toggle-thumb" />
        </button>
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="gc-field">
        <span className="gc-field-label">
          <span>{field.label}</span>
        </span>
        <select
          className="gc-select"
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="gc-field">
      <span className="gc-field-label">
        <span>{field.label}</span>
        <span className="gc-field-value">{formatValue(value)}</span>
      </span>
      <input
        className="gc-range"
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(event) => onChange(field.key, Number(event.target.value))}
      />
    </label>
  );
}

function formatValue(value) {
  if (typeof value !== 'number') return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function GalleryControls({
  open,
  onToggle,
  settings,
  onChange,
  onSetDefault,
  onResetSaved,
  onResetFactory,
  savedNotice,
}) {
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [openSections, setOpenSections] = useState(() =>
    isMobileViewport() ? { grid: true } : Object.fromEntries(SETTINGS_SECTIONS.map((s) => [s.id, true])),
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px), (pointer: coarse)');
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setOpenSections((prev) => {
        if (!mobile) {
          return Object.fromEntries(SETTINGS_SECTIONS.map((s) => [s.id, true]));
        }
        const anyOpen = Object.values(prev).some(Boolean);
        return anyOpen ? prev : { grid: true };
      });
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const toggleSection = (id) => {
    if (!isMobile) return;
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`gc ${open ? 'is-open' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      <button type="button" className="gc-fab" onClick={onToggle} aria-expanded={open}>
        {open ? 'Close' : 'Controls'}
      </button>

      {open && (
        <>
          {isMobile && (
            <button
              type="button"
              className="gc-backdrop"
              aria-label="Close controls"
              onClick={onToggle}
            />
          )}
          <aside className="gc-panel" aria-label="Gallery behavior controls">
            <div className="gc-sheet-handle" aria-hidden="true" />
            <header className="gc-header">
              <div>
                <p className="gc-kicker">Gallery</p>
                <h2>Behavior</h2>
              </div>
              {savedNotice && <p className="gc-notice">{savedNotice}</p>}
            </header>

            <div className="gc-actions">
              <button type="button" className="gc-btn gc-btn-primary" onClick={onSetDefault}>
                Set as default
              </button>
              <button type="button" className="gc-btn" onClick={onResetSaved}>
                Load default
              </button>
              <button type="button" className="gc-btn" onClick={onResetFactory}>
                Factory reset
              </button>
            </div>

            <div className="gc-sections">
              {SETTINGS_SECTIONS.map((section) => {
                const expanded = openSections[section.id] ?? !isMobile;
                return (
                  <section key={section.id} className={`gc-section ${expanded ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="gc-section-toggle"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={expanded}
                    >
                      <h3>{section.label}</h3>
                      {isMobile && <span className="gc-section-chevron">{expanded ? '−' : '+'}</span>}
                    </button>
                    {expanded && (
                      <div className="gc-fields">
                        {section.fields.map((field) => (
                          <FieldControl
                            key={field.key}
                            field={field}
                            value={settings[field.key]}
                            onChange={onChange}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default GalleryControls;
