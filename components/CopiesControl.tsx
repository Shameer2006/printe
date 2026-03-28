interface CopiesControlProps {
  copies: number;
  onCopiesChange: (copies: number) => void;
}

export function CopiesControl({ copies, onCopiesChange }: CopiesControlProps) {
  const handleChange = (d: number) => {
    const newCopies = Math.max(1, Math.min(10, copies + d));
    onCopiesChange(newCopies);
  };

  return (
    <>
      <div style={{ height: "8px" }}></div>
      <div className="copies-row">
        <div className="copies-left">
          <svg viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span className="copies-label">Copies</span>
        </div>
        <div className="copies-ctrl">
          <button className="copies-btn" onClick={() => handleChange(-1)}>
            −
          </button>
          <span className="copies-num">{copies}</span>
          <button className="copies-btn" onClick={() => handleChange(1)}>
            +
          </button>
        </div>
      </div>
    </>
  );
}
