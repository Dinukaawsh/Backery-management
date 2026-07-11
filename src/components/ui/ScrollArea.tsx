import { ReactNode } from "react";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollArea({ children, className = "" }: ScrollAreaProps) {
  return (
    <div className={`custom-scrollbar ${className}`}>{children}</div>
  );
}
