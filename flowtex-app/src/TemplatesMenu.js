import React, { useEffect, useRef } from 'react';
import { File, Columns2, Newspaper, GraduationCap, User } from 'lucide-react';

const ICONS = {
  blank: File,
  ieee: Columns2,
  acm: Newspaper,
  thesis: GraduationCap,
  cv: User,
};

const TemplatesMenu = ({ templates, onApply, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="templates-dropdown" ref={ref}>
      <div className="templates-dropdown-title">Start from a template</div>
      <div className="templates-grid">
        {templates.map((t) => {
          const Icon = ICONS[t.key] || File;
          return (
            <button key={t.key} className="template-card" onClick={() => onApply(t)}>
              <span className="template-card-icon"><Icon size={18} /></span>
              <span className="template-card-text">
                <span className="template-card-label">{t.label}</span>
                <span className="template-card-desc">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplatesMenu;
