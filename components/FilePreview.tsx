interface FilePreviewProps {
  file: File | null;
  pageCount: number | null;
  isDetecting: boolean;
  printCost: number;
  platformFee: number;
  totalCost: number;
  onRemove: () => void;
}

export function FilePreview({
  file,
  pageCount,
  isDetecting,
  printCost,
  platformFee,
  totalCost,
  onRemove,
}: FilePreviewProps) {
  if (!file) return null;

  const formatBytes = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="file-preview visible">
      <div className="file-header">
        <div className="file-icon">PDF</div>
        <div className="file-info">
          <div className="file-name">{file.name}</div>
          <div className="file-size">{formatBytes(file.size)}</div>
        </div>
        <button className="remove-btn" onClick={onRemove} title="Remove file">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="page-badge">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>
          {isDetecting
            ? "Detecting…"
            : pageCount !== null
            ? `${pageCount} pages detected`
            : "Unknown"}
        </span>
      </div>

      <div className="cost-breakdown">
        <div className="cost-row">
          <span className="cost-label">Print cost</span>
          <span className="cost-val">₹{printCost.toFixed(2)}</span>
        </div>
        <div className="cost-row">
          <span className="cost-label">Platform fee</span>
          <span className="cost-val">₹{platformFee.toFixed(2)}</span>
        </div>
        <div className="cost-divider"></div>
        <div className="cost-row cost-total">
          <span className="cost-label">Total</span>
          <span className="cost-val">₹{totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
