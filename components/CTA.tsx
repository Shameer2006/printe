interface CTAProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function CTA({ onClick, isLoading }: CTAProps) {
  return (
    <div className="cta-wrap" style={{ display: "block" }}>
      <button className="cta-btn" onClick={onClick} disabled={isLoading}>
        <div className="cta-left">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="19" y="14" width="2" height="2" />
            <rect x="14" y="19" width="2" height="2" />
            <rect x="18" y="18" width="3" height="3" />
          </svg>
          {isLoading ? "Processing..." : "Generate UPI QR"}
        </div>
        {!isLoading && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </button>
    </div>
  );
}
