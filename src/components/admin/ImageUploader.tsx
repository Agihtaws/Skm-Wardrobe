"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Star, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setProgress(0);
    const uploaded: string[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (!json.success) {
        toast.error(`Failed: ${json.error}`);
      } else {
        uploaded.push(json.data.url);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    if (uploaded.length) {
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
    }

    setUploading(false);
    setProgress(0);
    // Reset file input
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const removeImage = async (url: string, index: number) => {
    onChange(images.filter((_, i) => i !== index));
    // Delete from storage
    const pathMatch = url.match(/\/products\/(.+)$/);
    if (pathMatch?.[1]) {
      await fetch(`/api/admin/upload/${encodeURIComponent(pathMatch[1])}`, {
        method: "DELETE",
      });
    }
  };

  const setMain = (index: number) => {
    const updated = [...images];
    const [main]  = updated.splice(index, 1);
    onChange([main, ...updated]);
    toast.success("Set as main image");
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${
          uploading
            ? "border-pink-300 bg-pink-50 cursor-wait"
            : "border-gray-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
        />

        {uploading ? (
          <div>
            <Loader2 size={28} className="mx-auto text-pink-500 animate-spin mb-2" />
            <p className="text-sm font-medium text-pink-600">
              Uploading... {progress}%
            </p>
            <div className="mt-3 h-1.5 bg-pink-100 rounded-full overflow-hidden max-w-[200px] mx-auto">
              <div
                className="h-full bg-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload size={28} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Click or drag images here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, WEBP — up to 5MB each — any size, shown full
            </p>
          </>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative border border-gray-200 rounded-xl overflow-hidden bg-white"
            >
              {index === 0 && (
                <div className="absolute top-2 left-2 z-10 bg-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  MAIN
                </div>
              )}

              {/* Full image — object-contain */}
              <div className="h-44 flex items-center justify-center bg-gray-50 p-2">
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => setMain(index)}
                    title="Set as main image"
                    className="p-2 bg-white rounded-full hover:bg-yellow-50 transition-colors"
                  >
                    <Star size={15} className="text-amber-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(url, index)}
                  title="Remove image"
                  className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>

              <div className="px-2 py-1.5 text-[10px] text-gray-400 border-t border-gray-100 truncate">
                {index === 0 ? "Main thumbnail" : `Gallery image ${index}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}