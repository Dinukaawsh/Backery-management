"use client";

import { useEffect, useRef, useState } from "react";

type CategoryInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
};

export function CategoryInput({
  label,
  value,
  onChange,
  categories,
  placeholder = "Type or pick a category",
  required,
  error,
}: CategoryInputProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim();
  const filtered = categories.filter((category) => {
    if (!trimmed) return true;
    return category.toLowerCase().includes(trimmed.toLowerCase());
  });

  const showSuggestions = open && (filtered.length > 0 || trimmed.length > 0);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <p className="bakery-label">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </p>
      ) : null}
      <input
        type="text"
        required={required}
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        className="bakery-input w-full"
        autoComplete="off"
      />

      {showSuggestions ? (
        <div className="custom-scrollbar absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-amber-200 bg-white py-1 shadow-lg">
          {filtered.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                onChange(category);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                category === value
                  ? "bg-amber-100 font-medium text-black"
                  : "text-black hover:bg-amber-50"
              }`}
            >
              {category}
            </button>
          ))}
          {trimmed &&
          !categories.some(
            (category) => category.toLowerCase() === trimmed.toLowerCase(),
          ) ? (
            <button
              type="button"
              onClick={() => {
                onChange(trimmed);
                setOpen(false);
              }}
              className="block w-full border-t border-amber-100 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
            >
              Use new category: &quot;{trimmed}&quot;
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
