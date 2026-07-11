"use client";

import { useRef, useState } from "react";
import { HiOutlinePhoto, HiOutlineTrash } from "react-icons/hi2";

import { Button } from "./Button";
import { LoadingSpinner } from "./LoadingSpinner";

type ImageUploadProps = {
  label?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  optional?: boolean;
};

export function ImageUpload({
  label = "Image",
  value,
  onChange,
  optional = true,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body,
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      onChange(data.url as string);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="bakery-label">
        {label} {optional ? "(optional)" : ""}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Upload preview" className="h-full w-full object-cover" />
          ) : (
            <HiOutlinePhoto className="h-8 w-8 text-stone-400" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <span className="inline-flex items-center gap-2">
              <HiOutlinePhoto className="h-4 w-4" />
              {uploading ? "Uploading..." : "Choose image"}
            </span>
          </Button>
          {value ? (
            <Button variant="ghost" onClick={() => onChange(null)}>
              <span className="inline-flex items-center gap-2">
                <HiOutlineTrash className="h-4 w-4" />
                Remove
              </span>
            </Button>
          ) : null}
        </div>
      </div>
      {uploading ? <LoadingSpinner size="sm" label="Uploading to Cloudinary..." /> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
