import { SETTINGS_SECTIONS } from '../gallery/settings';
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
  return (
    <div className={`gc ${open ? 'is-open' : ''}`}>
      <button type="button" className="gc-fab" onClick={onToggle} aria-expanded={open}>
        {open ? 'Close' : 'Controls'}
      </button>

      {open && (
        <aside className="gc-panel" aria-label="Gallery behavior controls">
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
            {SETTINGS_SECTIONS.map((section) => (
              <section key={section.id} className="gc-section">
                <h3>{section.label}</h3>
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
              </section>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

export default GalleryControls;
