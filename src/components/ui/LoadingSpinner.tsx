type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  fullPage?: boolean;
};

const sizes = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export function LoadingSpinner({
  size = "md",
  label,
  fullPage,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-amber-200 border-t-amber-600 ${sizes[size]}`}
      />
      {label ? <p className="text-sm text-black">{label}</p> : null}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
