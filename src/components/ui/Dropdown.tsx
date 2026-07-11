"use client";

import { Children, ReactNode, isValidElement, useEffect, useRef, useState } from "react";
import {
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from "react-icons/hi2";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  error,
  disabled,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? <p className="bakery-label">{label}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`bakery-input flex w-full items-center justify-between text-left ${disabled ? "opacity-60" : ""}`}
      >
        <span className={selected ? "text-black" : "text-stone-500"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-black">
          {open ? (
            <HiOutlineChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <HiOutlineChevronDown className="h-4 w-4" aria-hidden />
          )}
        </span>
      </button>

      {open ? (
        <div className="custom-scrollbar absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-amber-200 bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                option.value === value
                  ? "bg-amber-100 font-medium text-black"
                  : "text-black hover:bg-amber-50"
              } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function optionsFromChildren(children: ReactNode): DropdownOption[] {
  const items: DropdownOption[] = [];
  if (!children) return items;

  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) {
      continue;
    }
    if (child.props.value === undefined) continue;

    items.push({
      value: String(child.props.value),
      label: String(child.props.children ?? child.props.value),
      disabled: Boolean(child.props.disabled),
    });
  }

  return items;
}
