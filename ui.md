<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>PrintEG</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #f5f5f3;
    --surface: #ffffff;
    --surface2: #f0f0ee;
    --border: rgba(0,0,0,0.08);
    --border-strong: rgba(0,0,0,0.18);
    --border-active: rgba(0,0,0,0.5);
    --text: #0d0d0d;
    --muted: #999;
    --muted2: #666;
    --green: #00a550;
    --green-bg: rgba(0,165,80,0.07);
    --green-border: rgba(0,165,80,0.2);
    --red: #e53935;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    min-height: 100dvh;
    display: flex;
    justify-content: center;
    overflow-x: hidden;
  }

  /* Dot grid */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px);
    background-size: 22px 22px;
    pointer-events: none;
    z-index: 0;
  }

  .app {
    width: 100%;
    max-width: 420px;
    min-height: 100dvh;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 0 0 110px;
  }

  /* ── Header ── */
  .header {
    padding: 52px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    color: var(--green);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 5px 10px;
    border-radius: 2px;
    width: fit-content;
    text-transform: uppercase;
  }

  .status-pill .dot {
    width: 5px; height: 5px;
    background: var(--green);
    border-radius: 50%;
    animation: blink 2s ease infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }

  .wordmark {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .headline {
    font-family: 'DM Sans', sans-serif;
    font-weight: 900;
    font-size: 40px;
    line-height: 1.05;
    color: var(--text);
    letter-spacing: -0.04em;
  }

  .headline span { color: #bbb; }

  /* ── Shop Card ── */
  .shop-card {
    margin: 0 24px 8px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 4px;
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.05s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .shop-left { display: flex; flex-direction: column; gap: 3px; }

  .shop-name {
    font-size: 14px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .shop-meta {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted2);
  }

  .printer-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--green);
    text-transform: uppercase;
    border: 1px solid var(--green-border);
    background: var(--green-bg);
    padding: 5px 9px;
    border-radius: 2px;
  }

  /* ── Tabs ── */
  .tabs {
    margin: 0 24px 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1.5px solid var(--border-strong);
    border-radius: 4px;
    overflow: hidden;
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.1s;
    background: var(--surface);
  }

  .tab {
    padding: 11px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted2);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .tab.active {
    background: var(--text);
    color: #fff;
  }

  .tab svg { width: 12px; height: 12px; }

  /* ── Upload Zone ── */
  .upload-zone {
    margin: 0 24px;
    border: 2px dashed var(--border-strong);
    border-radius: 4px;
    padding: 44px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.25s ease;
    background: var(--surface);
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.15s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .upload-zone:hover {
    border-color: var(--text);
    background: #fafaf8;
  }

  .upload-zone.drag-over {
    border-color: var(--text);
    background: #f0f0ee;
    transform: scale(0.99);
  }

  .upload-icon-wrap {
    width: 58px; height: 58px;
    border: 1.5px solid var(--border-strong);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }

  .upload-icon {
    width: 22px; height: 22px;
    stroke: var(--text);
    fill: none;
    stroke-width: 2;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  .upload-text { text-align: center; }

  .upload-text h3 {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.03em;
  }

  .upload-text p {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-transform: uppercase;
    margin-top: 4px;
  }

  .file-types { display: flex; gap: 6px; }

  .file-tag {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--muted2);
    border: 1px solid var(--border-strong);
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    background: var(--bg);
  }

  input[type=file] { display: none; }

  /* ── File Preview ── */
  .file-preview {
    margin: 10px 24px 0;
    background: var(--surface);
    border: 1.5px solid var(--border-strong);
    border-radius: 4px;
    overflow: hidden;
    display: none;
    animation: fadeUp 0.3s ease both;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .file-preview.visible { display: block; }

  .file-header {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .file-icon {
    width: 34px; height: 42px;
    background: var(--surface);
    border: 1.5px solid var(--border-strong);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0.05em;
  }

  .file-info { flex: 1; min-width: 0; }

  .file-name {
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .file-size {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-top: 2px;
  }

  .remove-btn {
    background: none;
    border: 1.5px solid var(--border-strong);
    color: var(--muted2);
    cursor: pointer;
    padding: 7px 9px;
    border-radius: 3px;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-btn:hover { border-color: var(--red); color: var(--red); }

  .page-badge {
    margin: 12px 16px 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--muted2);
    text-transform: uppercase;
    border: 1px solid var(--border-strong);
    padding: 4px 10px;
    border-radius: 2px;
    background: var(--bg);
    width: fit-content;
  }

  /* ── Cost Breakdown ── */
  .cost-breakdown { padding: 12px 16px 16px; }

  .cost-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
  }

  .cost-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted2);
  }

  .cost-val {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }

  .cost-divider { height: 1px; background: var(--border); margin: 6px 0; }

  .cost-total .cost-label { color: var(--text); font-size: 10px; }
  .cost-total .cost-val   { font-size: 20px; font-weight: 900; letter-spacing: -0.02em; }

  /* ── Section Rule ── */
  .section-rule {
    margin: 18px 24px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-rule span {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    white-space: nowrap;
  }

  .section-rule::before,
  .section-rule::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-strong);
  }

  /* ── Options Grid ── */
  .options-grid {
    margin: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.2s;
  }

  .option-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 4px;
    padding: 13px 14px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .option-card.selected {
    border-color: var(--text);
    background: var(--text);
  }

  .option-card.selected .opt-label { color: rgba(255,255,255,0.5); }
  .option-card.selected .opt-value { color: #fff; }
  .option-card.selected .opt-icon  { stroke: #fff; }

  .option-card:not(.selected):hover { border-color: var(--border-strong); }

  .opt-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .opt-value {
    font-size: 14px;
    font-weight: 800;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 7px;
    letter-spacing: -0.02em;
  }

  .opt-icon {
    width: 14px; height: 14px;
    stroke: var(--muted2);
    fill: none;
    stroke-width: 2;
    flex-shrink: 0;
  }

  /* ── Copies ── */
  .copies-row {
    margin: 8px 24px 0;
    border: 1.5px solid var(--border);
    border-radius: 4px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.25s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .copies-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .copies-left svg {
    width: 16px; height: 16px;
    stroke: var(--muted2);
    fill: none;
    stroke-width: 2;
  }

  .copies-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted2);
  }

  .copies-ctrl { display: flex; align-items: center; gap: 12px; }

  .copies-btn {
    width: 30px; height: 30px;
    border: 1.5px solid var(--border-strong);
    background: var(--bg);
    color: var(--text);
    border-radius: 3px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: 'Space Mono', monospace;
    line-height: 1;
  }

  .copies-btn:hover { background: var(--text); color: #fff; border-color: var(--text); }
  .copies-btn:active { transform: scale(0.93); }

  .copies-num {
    font-family: 'Space Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    width: 26px;
    text-align: center;
  }

  /* ── CTA ── */
  .cta-wrap {
    padding: 14px 24px 0;
    animation: fadeUp 0.4s ease both;
    animation-delay: 0.3s;
    display: none;
  }

  .cta-wrap.visible { display: block; }

  .cta-btn {
    width: 100%;
    padding: 17px 20px;
    background: var(--text);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  }

  .cta-btn:hover { background: #222; box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
  .cta-btn:active { transform: scale(0.99); }

  .cta-left { display: flex; align-items: center; gap: 10px; }

  .cta-btn svg {
    width: 18px; height: 18px;
    stroke: #fff;
    fill: none;
    stroke-width: 2;
  }

  /* ── Bottom Nav ── */
  .bottom-nav {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 48px);
    max-width: 372px;
    background: var(--text);
    border-radius: 4px;
    padding: 4px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0,0,0,0.22);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.2s;
  }

  .nav-item.active { background: rgba(255,255,255,0.12); }

  .nav-icon {
    width: 17px; height: 17px;
    stroke: rgba(255,255,255,0.4);
    fill: none;
    stroke-width: 2;
  }

  .nav-item.active .nav-icon { stroke: #fff; }

  .nav-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }

  .nav-item.active .nav-label { color: #fff; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Processing shimmer */
  .shimmer {
    background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
    border-radius: 2px;
    height: 10px;
    width: 80px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
</head>
<body>

<div class="app">

  <!-- Header -->
  <div class="header">
    <div class="status-pill">
      <div class="dot"></div>
      Kiosk Online — A12
    </div>
    <div class="wordmark">PrintEG</div>
    <div class="headline">Print.<br><span>Easy. Go.</span></div>
  </div>

  <!-- Shop Card -->
  <div class="shop-card">
    <div class="shop-left">
      <div class="shop-name">Harish Xerox Center</div>
      <div class="shop-meta">₹2.00 / page &nbsp;·&nbsp; Fee: 15p</div>
    </div>
    <div class="printer-status">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Ready
    </div>
  </div>

  <!-- Tabs -->
  <div style="height:10px"></div>
  <div class="tabs">
    <button class="tab active" onclick="switchTab(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      Upload PDF
    </button>
    <button class="tab" onclick="switchTab(this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      AI Tools
    </button>
  </div>

  <!-- Upload Zone -->
  <label class="upload-zone" id="uploadZone" for="fileInput"
         ondragover="handleDrag(event,true)"
         ondragleave="handleDrag(event,false)"
         ondrop="handleDrop(event)">
    <div class="upload-icon-wrap">
      <svg class="upload-icon" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </div>
    <div class="upload-text">
      <h3>Drop your document</h3>
      <p>Tap to browse files</p>
    </div>
    <div class="file-types">
      <span class="file-tag">PDF</span>
      <span class="file-tag">JPG</span>
      <span class="file-tag">PNG</span>
    </div>
  </label>
  <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFile(this)">

  <!-- File Preview -->
  <div class="file-preview" id="filePreview">
    <div class="file-header">
      <div class="file-icon">PDF</div>
      <div class="file-info">
        <div class="file-name" id="fileName">document.pdf</div>
        <div class="file-size" id="fileSize">—</div>
      </div>
      <button class="remove-btn" onclick="removeFile()" title="Remove file">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="page-badge" id="pageBadge">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span id="pageCountText">Detecting…</span>
    </div>

    <div class="cost-breakdown">
      <div class="cost-row">
        <span class="cost-label">Print cost</span>
        <span class="cost-val" id="printCost">—</span>
      </div>
      <div class="cost-row">
        <span class="cost-label">Platform fee</span>
        <span class="cost-val" id="platformFee">—</span>
      </div>
      <div class="cost-divider"></div>
      <div class="cost-row cost-total">
        <span class="cost-label">Total</span>
        <span class="cost-val" id="totalCost">—</span>
      </div>
    </div>
  </div>

  <!-- Print Options -->
  <div class="section-rule"><span>Print Options</span></div>

  <div class="options-grid">
    <div class="option-card selected" id="opt-single" onclick="selectOpt('side','single')">
      <div class="opt-label">Sides</div>
      <div class="opt-value">
        <svg class="opt-icon" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
        </svg>
        Single
      </div>
    </div>
    <div class="option-card" id="opt-double" onclick="selectOpt('side','double')">
      <div class="opt-label">Sides</div>
      <div class="opt-value">
        <svg class="opt-icon" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
        </svg>
        Double
      </div>
    </div>
    <div class="option-card selected" id="opt-bw" onclick="selectOpt('color','bw')">
      <div class="opt-label">Color</div>
      <div class="opt-value">
        <svg class="opt-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 3a9 9 0 010 18V3z" fill="currentColor" stroke="none"/>
        </svg>
        B&amp;W
      </div>
    </div>
    <div class="option-card" id="opt-color" onclick="selectOpt('color','color')">
      <div class="opt-label">Color</div>
      <div class="opt-value">
        <svg class="opt-icon" viewBox="0 0 24 24">
          <circle cx="8" cy="14" r="4" stroke="#f87171" fill="none"/>
          <circle cx="16" cy="14" r="4" stroke="#60a5fa" fill="none"/>
          <circle cx="12" cy="8"  r="4" stroke="#4ade80" fill="none"/>
        </svg>
        Color
      </div>
    </div>
  </div>

  <!-- Copies -->
  <div style="height:8px"></div>
  <div class="copies-row">
    <div class="copies-left">
      <svg viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
      <span class="copies-label">Copies</span>
    </div>
    <div class="copies-ctrl">
      <button class="copies-btn" onclick="changeCopies(-1)">−</button>
      <span class="copies-num" id="copiesNum">1</span>
      <button class="copies-btn" onclick="changeCopies(1)">+</button>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-wrap" id="ctaWrap">
    <button class="cta-btn" onclick="generateQR()">
      <div class="cta-left">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="3" height="3"/>
          <rect x="19" y="14" width="2" height="2"/>
          <rect x="14" y="19" width="2" height="2"/>
          <rect x="18" y="18" width="3" height="3"/>
        </svg>
        Generate UPI QR
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  </div>

</div>

<!-- Bottom Nav -->
<nav class="bottom-nav">
  <div class="nav-item active">
    <svg class="nav-icon" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <span class="nav-label">Upload</span>
  </div>
  <div class="nav-item">
    <svg class="nav-icon" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
    <span class="nav-label">AI Tools</span>
  </div>
  <div class="nav-item">
    <svg class="nav-icon" viewBox="0 0 24 24">
      <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
    <span class="nav-label">My Jobs</span>
  </div>
</nav>

<script>
  let copies = 1;
  let pageCount = 0;

  function switchTab(el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }

  function handleDrag(e, over) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.toggle('drag-over', over);
  }

  function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFile(input) {
    if (input.files[0]) processFile(input.files[0]);
  }

  function processFile(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);
    document.getElementById('filePreview').classList.add('visible');
    document.getElementById('ctaWrap').classList.add('visible');
    document.getElementById('pageCountText').textContent = 'Detecting…';

    setTimeout(() => {
      pageCount = Math.floor(Math.random() * 12) + 2;
      updateCosts();
    }, 900);
  }

  function updateCosts() {
    const RATE = 2.00;
    const FEE  = 0.15;
    const print = (pageCount * RATE * copies).toFixed(2);
    const fee   = (pageCount * FEE  * copies).toFixed(2);
    const total = (parseFloat(print) + parseFloat(fee)).toFixed(2);

    document.getElementById('pageCountText').textContent = `${pageCount} pages detected`;
    document.getElementById('printCost').textContent  = `₹${print}`;
    document.getElementById('platformFee').textContent = `₹${fee}`;
    document.getElementById('totalCost').textContent  = `₹${total}`;
  }

  function removeFile() {
    document.getElementById('filePreview').classList.remove('visible');
    document.getElementById('ctaWrap').classList.remove('visible');
    document.getElementById('fileInput').value = '';
    pageCount = 0;
  }

  function selectOpt(group, id) {
    if (group === 'side') {
      document.getElementById('opt-single').classList.remove('selected');
      document.getElementById('opt-double').classList.remove('selected');
    } else {
      document.getElementById('opt-bw').classList.remove('selected');
      document.getElementById('opt-color').classList.remove('selected');
    }
    document.getElementById('opt-' + id).classList.add('selected');
  }

  function changeCopies(d) {
    copies = Math.max(1, Math.min(10, copies + d));
    document.getElementById('copiesNum').textContent = copies;
    if (pageCount > 0) updateCosts();
  }

  function generateQR() {
    alert('Generating UPI QR… (connect to Firebase)');
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
</script>
</body>
</html>