import React, { useState, useEffect, useCallback } from 'react';
import {Plus, Minus} from 'lucide-react';

const DEFAULT_SIZE = 12;

const FontSizeControl = ({ editor }) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Read the current font size from the editor selection
  const getCurrentSize = useCallback(() => {
    if (!editor) return '';
    const attrs = editor.getAttributes('textStyle');
    if (attrs?.fontSize) {
      // parse the pt value, e.g. "14pt" -> 14
      const match = attrs.fontSize.match(/^(\d+(?:\.\d+)?)pt$/);
      if (match) return match[1];
    }
    return '';
  }, [editor]);

  // Update the input when selection changes
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (!isFocused) {
        setValue(getCurrentSize());
      }
    };
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
    };
  }, [editor, isFocused, getCurrentSize]);

  const applySize = (size) => {
    if (!editor) return;
    if (size) {
      editor.chain().focus().setFontSize(`${size}pt`).run();
    } else {
      editor.chain().focus().unsetFontSize().run();
    }
  };

  const increment = () => {
    const current = parseFloat(value) || getCurrentSize() || DEFAULT_SIZE;
    const newVal = Math.min(72, current + 1);
    setValue(newVal.toString());
    applySize(newVal);
  };

  const decrement = () => {
    const current = parseFloat(value) || getCurrentSize() || DEFAULT_SIZE;
    const newVal = Math.max(6, current - 1);
    setValue(newVal.toString());
    applySize(newVal);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 6 && num <= 72) {
        applySize(num);
      } else if (value === '') {
        applySize('');
      }
    } else if (e.key === 'Escape') {
      setValue(getCurrentSize());
      (e.target).blur();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 6 && num <= 72) {
      applySize(num);
    } else if (value === '') {
      applySize('');
    } else {
      // reset to current or empty
      setValue(getCurrentSize());
    }
  };

  return (
    <div className="font-size-control">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={decrement}
        className="font-size-btn"
        title="Decrease font size"
      >
        <Minus size={16}/>
      </button>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => { setIsFocused(true); setValue(getCurrentSize()); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={getCurrentSize() || DEFAULT_SIZE.toString()}
        className="font-size-input"
      />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={increment}
        className="font-size-btn"
        title="Increase font size"
      >
        <Plus size={16}/>
      </button>
    </div>
  );
};

export default FontSizeControl;