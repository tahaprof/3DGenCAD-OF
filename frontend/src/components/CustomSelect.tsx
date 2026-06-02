import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'minimal';
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "", variant = "default" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 4,
        left: variant === 'minimal' ? rect.right + window.scrollX - 140 : rect.left + window.scrollX,
        width: variant === 'minimal' ? 140 : rect.width,
        zIndex: 9999,
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // true for capture phase to catch scroll on any element
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // The event target might be in the portal, so we check if it's inside the container 
      // or if it's an option click (which we handle anyway)
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Simple heuristic: if we clicked an li with cursor-pointer, it might be our portal.
        // Better: add an ID to the portal container and check it.
        const target = event.target as HTMLElement;
        if (!target.closest('.custom-select-portal')) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const variantStyles = variant === 'minimal'
    ? `w-full flex items-center justify-between text-xs font-medium bg-transparent focus:outline-none cursor-pointer border-b border-dashed border-slate-300 dark:border-slate-600 pb-0.5 text-slate-700 dark:text-slate-300 ${isOpen ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' : ''}`
    : `w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border ${isOpen ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-sm font-medium text-slate-900 dark:text-white transition-all`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={variantStyles}
      >
        <span className="truncate mr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          className="custom-select-portal bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden py-1"
          style={dropdownStyle}
        >
          <ul className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  value === option.value
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white'
                }`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
