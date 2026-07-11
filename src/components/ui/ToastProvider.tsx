"use client";

import toast, { Toaster } from "react-hot-toast";
import {
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi2";

type ToastType = "success" | "error";

const toastApi = {
  show(message: string, type: ToastType = "success") {
    if (type === "error") {
      toast.error(message);
      return;
    }
    toast.success(message);
  },
  success(message: string) {
    toast.success(message);
  },
  error(message: string) {
    toast.error(message);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{ top: 20 }}
        toastOptions={{
          duration: 3600,
          className: "bakery-hot-toast",
          success: {
            className: "bakery-hot-toast bakery-hot-toast-success",
            icon: <HiCheckCircle className="h-5 w-5 shrink-0" aria-hidden />,
          },
          error: {
            className: "bakery-hot-toast bakery-hot-toast-error",
            icon: (
              <HiExclamationCircle className="h-5 w-5 shrink-0" aria-hidden />
            ),
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return toastApi;
}
