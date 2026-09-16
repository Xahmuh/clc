'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string | number | undefined | null;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'badge';
  badgeStyle?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
  id?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  searchable,
  searchPlaceholder = 'Search...',
  size = 'md',
  variant = 'default',
  badgeStyle = '',
  align = 'left',
  fullWidth = true,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 9;

  // Selected Option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filtered Options for searchable mode
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex];
        if (!opt.disabled) {
          onChange(opt.value);
          setIsOpen(false);
        }
      }
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-xs sm:text-sm',
    lg: 'px-3.5 py-2.5 text-sm',
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      {variant === 'badge' ? (
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all focus:outline-none focus:ring-1 focus:ring-ink-900 cursor-pointer ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          } ${badgeStyle} ${triggerClassName}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`flex items-center justify-between gap-2 w-full bg-white border border-gray-200 rounded-button text-ink-900 transition-colors focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 text-left rtl:text-right ${
            sizeClasses[size]
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300 cursor-pointer'} ${triggerClassName}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            <span
              className={`truncate font-medium ${
                selectedOption ? 'text-ink-900' : 'text-gray-400 font-normal'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-ink-900' : ''
            }`}
          />
        </button>
      )}

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          aria-labelledby={selectId}
          className={`absolute top-full mt-1.5 z-50 min-w-full bg-white border border-gray-200 rounded-card shadow-lg p-1.5 animate-in fade-in-0 zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
          style={{ minWidth: fullWidth ? '100%' : 'max-content' }}
        >
          {/* Optional Search Bar for Long Lists */}
          {isSearchEnabled && (
            <div className="p-1 mb-1 border-b border-gray-100">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-button text-ink-900 placeholder:text-gray-400 focus:outline-none focus:border-ink-900 focus:bg-white"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-gray-400 font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-button text-xs sm:text-sm cursor-pointer transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-cream-100 text-ink-900 font-semibold'
                        : isHighlighted
                        ? 'bg-gray-50 text-ink-900'
                        : 'text-ink-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate leading-tight">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[11px] text-gray-400 font-normal truncate mt-0.5">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-ink-900" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
