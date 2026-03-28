export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="nav-item active">
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="nav-label">Upload</span>
      </div>
      <div className="nav-item">
        <svg className="nav-icon" viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className="nav-label">AI Tools</span>
      </div>
      <div className="nav-item">
        <svg className="nav-icon" viewBox="0 0 24 24">
          <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        <span className="nav-label">My Jobs</span>
      </div>
    </nav>
  );
}
