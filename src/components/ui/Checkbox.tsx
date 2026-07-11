"use client";

import { HiCheck } from "react-icons/hi2";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
};

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  description,
}: CheckboxProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3 ${disabled ? "opacity-60" : ""}`}
    >
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-5 rounded-md border border-amber-300 bg-white transition peer-checked:border-amber-600 peer-checked:bg-amber-600" />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center text-white peer-checked:flex">
          <HiCheck className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
      <span>
        <span className="block text-sm font-medium text-black">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-stone-600">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
