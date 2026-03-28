export function ShopCard() {
  return (
    <div className="shop-card">
      <div className="shop-left">
        <div className="shop-name">Harish Xerox Center</div>
        <div className="shop-meta">₹2.00 / page &nbsp;·&nbsp; Fee: 15p</div>
      </div>
      <div className="printer-status">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Ready
      </div>
    </div>
  );
}
