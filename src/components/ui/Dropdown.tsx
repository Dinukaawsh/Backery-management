"use client";

import {
  Children,
  ReactNode,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

function flattenLabel(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenLabel).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenLabel(node.props.children);
  }
  return "";
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
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
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  function updateMenuPosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const preferredMax = 224; // ~max-h-56
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      preferredMax,
      Math.max(120, openUp ? spaceAbove : spaceBelow),
    );

    setMenuPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="custom-scrollbar z-[100] overflow-y-auto rounded-xl border border-amber-200 bg-white py-1 shadow-lg"
            style={{
              position: "fixed",
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              ...(menuPos.openUp
                ? { bottom: window.innerHeight - menuPos.top, top: "auto" }
                : { top: menuPos.top }),
            }}
          >
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? <p className="bakery-label">{label}</p> : null}
      <button
        ref={buttonRef}
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

      {menu}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function optionsFromChildren(children: ReactNode): DropdownOption[] {
  const items: DropdownOption[] = [];
  if (!children) return items;

  for (const child of Children.toArray(children)) {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    ) {
      continue;
    }
    if (child.props.value === undefined) continue;

    items.push({
      value: String(child.props.value),
      label: flattenLabel(child.props.children) || String(child.props.value),
      disabled: Boolean(child.props.disabled),
    });
  }

  return items;
}
