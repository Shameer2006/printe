"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrag = (e: React.DragEvent, over: boolean) => {
    e.preventDefault();
    setIsDragOver(over);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <>
      <label
        className={`upload-zone ${isDragOver ? "drag-over" : ""}`}
        id="uploadZone"
        onDragOver={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon-wrap">
          <svg className="upload-icon" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="upload-text">
          <h3>Drop your document</h3>
          <p>Tap to browse files</p>
        </div>
        <div className="file-types">
          <span className="file-tag">PDF</span>
          <span className="file-tag">JPG</span>
          <span className="file-tag">PNG</span>
        </div>
      </label>
      <input
        type="file"
        id="fileInput"
        ref={fileInputRef}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </>
  );
}
