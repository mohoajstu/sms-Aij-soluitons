import { useState } from "react";
import { CFormTextarea, CButton } from "@coreui/react";
import CIcon from '@coreui/icons-react';
import { cilStar } from '@coreui/icons';
import PropTypes from 'prop-types';

export function AIInputField({
  label,
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  placeholder = ""
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <CFormTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-10 min-h-[150px] resize-y ${
            isFocused ? 'ring-2 ring-edu-blue ring-opacity-50' : ''
          } ${isGenerating ? 'bg-blue-50' : ''}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <CButton
          type="button"
          variant="ghost"
          size="sm"
          className={`absolute right-2 top-2 text-muted-foreground hover:text-edu-accent hover:bg-transparent ${
            isGenerating ? 'text-edu-blue animate-pulse-light' : ''
          }`}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <CIcon icon={cilStar} className="h-4 w-4" />
          <span className="sr-only">Generate with AI</span>
        </CButton>
      </div>
      {isGenerating && (
        <p className="text-xs text-edu-light-blue animate-pulse">
          Generating content...
        </p>
      )}
    </div>
  );
}

AIInputField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
  placeholder: PropTypes.string
};
