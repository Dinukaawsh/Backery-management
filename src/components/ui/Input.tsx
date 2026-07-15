"use client";

import { InputHTMLAttributes, useState } from "react";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";

import { useT } from "@/lib/i18n";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  error,
  className = "",
  id,
  type,
  ...props
}: InputProps) {
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="bakery-label">
          {label}
        </label>
      ) : null}

      {isPassword ? (
        <div className="icon-input-wrap">
          <input
            id={inputId}
            type={inputType}
            className={className}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="shrink-0 rounded-lg p-1 text-stone-500 transition hover:bg-amber-50 hover:text-amber-800"
            aria-label={
              showPassword
                ? t("login.hidePasswordAria")
                : t("login.showPasswordAria")
            }
            tabIndex={-1}
          >
            {showPassword ? (
              <HiOutlineEyeSlash className="h-5 w-5" aria-hidden />
            ) : (
              <HiOutlineEye className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      ) : (
        <input
          id={inputId}
          type={type}
          className={`bakery-input ${className}`}
          {...props}
        />
      )}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
