interface TabsProps {
  activeTab: "upload" | "ai";
  onTabChange: (tab: "upload" | "ai") => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <>
      <div style={{ height: "10px" }}></div>
      <div className="tabs">
        <button
          className={`tab ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => onTabChange("upload")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Upload PDF
        </button>
        {/* AI Tools (commented out for now) */}
        {/* <button
          className={`tab ${activeTab === "ai" ? "active" : ""}`}
          onClick={() => onTabChange("ai")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          AI Tools
        </button> */}
      </div>
    </>
  );
}
