interface PrintOptionsProps {
  side: "single" | "double";
  color: "bw" | "color";
  onSideChange: (side: "single" | "double") => void;
  onColorChange: (color: "bw" | "color") => void;
}

export function PrintOptions({
  side,
  color,
  onSideChange,
  onColorChange,
}: PrintOptionsProps) {
  return (
    <>
      <div className="section-rule">
        <span>Print Options</span>
      </div>

      <div className="options-grid">
        <div
          className={`option-card ${side === "single" ? "selected" : ""}`}
          onClick={() => onSideChange("single")}
        >
          <div className="opt-label">Sides</div>
          <div className="opt-value">
            <svg className="opt-icon" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            Single
          </div>
        </div>
        <div
          className={`option-card ${side === "double" ? "selected" : ""}`}
          onClick={() => onSideChange("double")}
        >
          <div className="opt-label">Sides</div>
          <div className="opt-value">
            <svg className="opt-icon" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            Double
          </div>
        </div>
        <div
          className={`option-card ${color === "bw" ? "selected" : ""}`}
          onClick={() => onColorChange("bw")}
        >
          <div className="opt-label">Color</div>
          <div className="opt-value">
            <svg className="opt-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 010 18V3z" fill="currentColor" stroke="none" />
            </svg>
            B&amp;W
          </div>
        </div>
        <div
          className={`option-card ${color === "color" ? "selected" : ""}`}
          onClick={() => onColorChange("color")}
        >
          <div className="opt-label">Color</div>
          <div className="opt-value">
            <svg className="opt-icon" viewBox="0 0 24 24">
              <circle cx="8" cy="14" r="4" stroke="#f87171" fill="none" />
              <circle cx="16" cy="14" r="4" stroke="#60a5fa" fill="none" />
              <circle cx="12" cy="8" r="4" stroke="#4ade80" fill="none" />
            </svg>
            Color
          </div>
        </div>
      </div>
    </>
  );
}
