"use client";

import { Children, ReactNode, isValidElement } from "react";

import { Dropdown, DropdownOption } from "./Dropdown";

type SelectProps = {
  label?: string;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  options?: DropdownOption[];
  placeholder?: string;
};

function optionsFromElements(children: ReactNode): DropdownOption[] {
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

export function Select({
  label,
  value = "",
  onChange,
  onValueChange,
  error,
  disabled,
  className,
  children,
  options,
  placeholder,
}: SelectProps) {
  const resolvedOptions = options ?? optionsFromElements(children);

  return (
    <Dropdown
      label={label}
      value={value}
      onChange={(nextValue) => {
        onValueChange?.(nextValue);
        onChange?.({ target: { value: nextValue } });
      }}
      options={resolvedOptions}
      placeholder={placeholder ?? "Select option"}
      error={error}
      disabled={disabled}
      className={className}
    />
  );
}
