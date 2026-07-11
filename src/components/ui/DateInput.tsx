"use client";

import { DatePicker, DateTimePicker as CustomDateTimePicker } from "./DatePicker";

type DateInputProps = {
  label?: string;
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  error?: string;
  disabled?: boolean;
};

export function DateInput({
  onChange,
  ...props
}: DateInputProps) {
  return (
    <DatePicker
      {...props}
      onChange={(value) => onChange({ target: { value } })}
    />
  );
}

export function DateTimeInput({
  onChange,
  ...props
}: DateInputProps) {
  return (
    <CustomDateTimePicker
      {...props}
      onChange={(value) => onChange({ target: { value } })}
    />
  );
}
