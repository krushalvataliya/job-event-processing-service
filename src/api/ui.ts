export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Event Processing Service — Developer Portal & API Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --surface: #101624;
      --card: #151d2f;
      --card-hover: #1b253b;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #6366f1;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-glow: rgba(99, 102, 241, 0.25);
      --accent: #06b6d4;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --error: #ef4444;
      --error-bg: rgba(239, 68, 68, 0.12);
      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-code: 'Fira Code', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ui);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Ambient background gradient glow */
    .ambient-glow {
      position: fixed;
      top: -150px;
      right: 15%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(16, 22, 36, 0.85);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .logo-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #6366f1, #06b6d4);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px var(--primary-glow);
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff;
    }

    .brand h1 {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .tag-pill {
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 500;
      border: 1px solid var(--border);
    }

    .header-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nav-btn:hover {
      color: var(--text);
    }

    .nav-btn.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .health-telemetry {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
    }

    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      display: inline-block;
      animation: pulse 2s infinite;
    }

    .status-dot.disconnected {
      background: var(--error);
      box-shadow: 0 0 10px var(--error);
      animation: none;
    }

    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Main Container */
    main {
      position: relative;
      z-index: 1;
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.75rem 2rem 4rem 2rem;
    }

    /* Playground Grid */
    .playground-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.75rem;
    }

    @media (max-width: 1024px) {
      .playground-grid { grid-template-columns: 1fr; }
      header { flex-direction: column; align-items: flex-start; }
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    }

    .card-header {
      padding: 1rem 1.25rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-method {
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 0.7rem;
      font-weight: 700;
      font-family: var(--font-code);
      text-transform: uppercase;
    }

    .badge-post { background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); }
    .badge-get { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }

    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Template Presets Bar */
    .presets-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 0.25rem;
    }

    .preset-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .preset-btn:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--primary);
      color: #fff;
    }

    /* Form Fields */
    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .form-input, .form-select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 8px;
      font-family: var(--font-ui);
      font-size: 0.85rem;
      transition: border-color 0.15s ease;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    textarea.form-code {
      background: #090c14;
      border: 1px solid var(--border);
      color: #38bdf8;
      padding: 10px;
      border-radius: 8px;
      font-family: var(--font-code);
      font-size: 0.82rem;
      line-height: 1.4;
      resize: vertical;
      min-height: 130px;
    }

    textarea.form-code:focus {
      outline: none;
      border-color: var(--border-focus);
    }

    /* Action Buttons */
    .btn-submit {
      background: linear-gradient(135deg, var(--primary), #4f46e5);
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px var(--primary-glow);
    }

    .btn-submit:hover {
      background: linear-gradient(135deg, #7073ff, #6366f1);
      transform: translateY(-1px);
    }

    .btn-submit:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fff;
      transform: translateY(-1px);
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .toast-banner {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: #151d2f;
      border: 1px solid var(--border);
      padding: 12px 18px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(100px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast-banner.show {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* Response Display Box */
    .response-container {
      background: #07090f;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }

    .status-badge {
      padding: 3px 8px;
      border-radius: 5px;
      font-weight: 700;
      font-family: var(--font-code);
      font-size: 0.75rem;
    }

    .status-202 { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
    .status-200 { background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.4); }
    .status-409 { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid var(--warning); }
    .status-400, .status-404, .status-500 { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }

    pre.code-output {
      font-family: var(--font-code);
      font-size: 0.8rem;
      color: #cbd5e1;
      overflow-x: auto;
      max-height: 220px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Jobs Cards Grid */
    .jobs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .job-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .job-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .job-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .job-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
    }

    .job-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }

    .skill-pill {
      background: rgba(6, 182, 212, 0.12);
      color: #67e8f9;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
    }

    /* Docs View */
    .docs-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .doc-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.75rem;
    }

    .doc-section h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .doc-section p {
      color: var(--text-muted);
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .table-container {
      overflow-x: auto;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    table.data-table th {
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
    }

    table.data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text);
    }

    code {
      font-family: var(--font-code);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.82rem;
      color: #38bdf8;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>

  <!-- Header & Telemetry -->
  <header>
    <div class="brand">
      <div class="logo-badge">⚡</div>
      <div>
        <h1>Job Event Processing Service</h1>
        <div class="brand-meta">
          <span>Enterprise Ingestion & Projection Platform</span>
          <span class="tag-pill">Node 22 Strict</span>
          <span class="tag-pill">MongoDB Engine</span>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="header-nav">
      <button class="nav-btn active" id="tab-playground-btn" onclick="switchTab('playground')">
        <span>🚀</span> Live API Playground
      </button>
      <button class="nav-btn" id="tab-docs-btn" onclick="switchTab('docs')">
        <span>📖</span> Architecture & Specs
      </button>
    </div>

    <!-- Real-time Health Telemetry & Actions -->
    <div style="display:flex; align-items:center; gap:0.75rem;">
      <div class="health-telemetry">
        <span class="status-dot" id="db-status-dot"></span>
        <span id="db-status-text">MongoDB: Checking...</span>
        <span class="tag-pill" id="db-latency-pill">-- ms</span>
      </div>
      <button class="btn-danger" id="btn-clear-db" onclick="clearDatabase()" title="Purge events and jobs from database">
        <span>🗑️</span> Clear DB
      </button>
    </div>
  </header>

  <main>
    <!-- TAB 1: LIVE API PLAYGROUND -->
    <section id="tab-playground">
      <div class="playground-grid">
        
        <!-- LEFT COLUMN: POST /events INGESTION -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="badge-method badge-post">POST</span>
              <span>/events &mdash; Idempotent Event Ingestion</span>
            </div>
            <span class="tag-pill">Insert-First Idempotency</span>
          </div>
          <div class="card-body">
            <!-- Preset Scenario Buttons -->
            <div>
              <label style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Quick Scenario Presets</label>
              <div class="presets-bar">
                <button class="preset-btn" onclick="loadPreset('valid-v1')">🟢 Initial v1 (202)</button>
                <button class="preset-btn" onclick="loadPreset('replay')">🔁 Exact Replay (200)</button>
                <button class="preset-btn" onclick="loadPreset('conflict')">⚠️ Conflict Payload (409)</button>
                <button class="preset-btn" onclick="loadPreset('ooo-v3')">⏩ Out-of-Order v3 (202)</button>
                <button class="preset-btn" onclick="loadPreset('archive')">🪦 Archive Tombstone (202)</button>
                <button class="preset-btn" onclick="loadPreset('whitespace')">❌ Whitespace Error (400)</button>
              </div>
            </div>

            <!-- Ingestion Form -->
            <div class="form-row">
              <div class="form-group">
                <label>Tenant ID</label>
                <input class="form-input" id="inp-tenantId" value="tenant-alpha" />
              </div>
              <div class="form-group">
                <label>Source ID</label>
                <input class="form-input" id="inp-sourceId" value="main-portal" />
              </div>
              <div class="form-group">
                <label>Event ID</label>
                <input class="form-input" id="inp-eventId" value="evt-101" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>External Job ID</label>
                <input class="form-input" id="inp-jobId" value="job-senior-dev" />
              </div>
              <div class="form-group">
                <label>Version</label>
                <input class="form-input" type="number" id="inp-version" value="1" min="1" />
              </div>
              <div class="form-group">
                <label>Operation</label>
                <select class="form-select" id="inp-operation">
                  <option value="upsert">upsert</option>
                  <option value="archive">archive</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Payload (JSON)</label>
              <textarea class="form-code" id="inp-payload">{
  "title": "Senior Distributed Systems Engineer",
  "company": "Apex Core Labs",
  "location": "Remote",
  "experienceMin": 4,
  "experienceMax": 8,
  "applyUrl": "https://apex.test/apply/101",
  "skills": ["TypeScript", "MongoDB", "Distributed Systems"]
}</textarea>
            </div>

            <button class="btn-submit" id="btn-submit-event" onclick="submitEvent()">
              <span>🚀</span> Dispatch Event to Ingestion Engine
            </button>

            <!-- Response Viewer -->
            <div class="response-container">
              <div class="response-header">
                <span style="font-weight:600; color:var(--text-muted);">HTTP Ingestion Response</span>
                <div>
                  <span class="status-badge" id="post-status-badge" style="display:none;"></span>
                  <span style="color:var(--text-dim); margin-left:6px;" id="post-duration"></span>
                </div>
              </div>
              <pre class="code-output" id="post-response-output">// Click "Dispatch Event" or select a preset to test the API...</pre>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: EVENT TRACKER & JOBS EXPLORER -->
        <div style="display:flex; flex-direction:column; gap:1.75rem;">
          
          <!-- Event Status Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span class="badge-method badge-get">GET</span>
                <span>/events/:eventId &mdash; Audit Status</span>
              </div>
              <button class="btn-secondary" onclick="fetchEventStatus()">Inspect Status</button>
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Tenant ID</label>
                  <input class="form-input" id="inp-status-tenant" value="tenant-alpha" />
                </div>
                <div class="form-group">
                  <label>Source ID</label>
                  <input class="form-input" id="inp-status-source" value="main-portal" />
                </div>
                <div class="form-group">
                  <label>Event ID</label>
                  <input class="form-input" id="inp-status-event" value="evt-101" />
                </div>
              </div>
              <div class="response-container" style="min-height:90px;">
                <div class="response-header">
                  <span style="font-weight:600; color:var(--text-muted);">Event Lifecycle State</span>
                  <span class="status-badge" id="event-state-badge" style="display:none;"></span>
                </div>
                <pre class="code-output" id="event-status-output">// Enter Event ID and click Inspect Status...</pre>
              </div>
            </div>
          </div>

          <!-- Job Projections Explorer Card -->
          <div class="card" style="flex:1;">
            <div class="card-header">
              <div class="card-title">
                <span class="badge-method badge-get">GET</span>
                <span>/jobs &mdash; Materialized Projections</span>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn-secondary" onclick="fetchJobs()">Query Projections</button>
                <button class="btn-secondary" style="color:#f87171; border-color:rgba(239,68,68,0.3);" onclick="clearTenantRecords()" title="Clear records for this tenant only">Clear Tenant</button>
              </div>
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Tenant ID</label>
                  <input class="form-input" id="inp-jobs-tenant" value="tenant-alpha" />
                </div>
                <div class="form-group">
                  <label>Status Filter</label>
                  <select class="form-select" id="inp-jobs-status">
                    <option value="active">active only</option>
                    <option value="archived">archived only</option>
                    <option value="all">all statuses</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Limit</label>
                  <input class="form-input" type="number" id="inp-jobs-limit" value="10" min="1" max="50" />
                </div>
              </div>

              <!-- Live Job Cards Grid -->
              <div class="jobs-grid" id="jobs-cards-container">
                <div style="color:var(--text-dim); text-align:center; padding:2rem 1rem;">
                  Click "Query Projections" to inspect active and archived jobs for this tenant.
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- TAB 2: ARCHITECTURE & SPECS -->
    <section id="tab-docs" class="hidden">
      <div class="docs-container">
        
        <div class="doc-section">
          <h2>🛡️ Core Architectural Invariants</h2>
          <p>The Job Event Processing Service is engineered for strict distributed correctness under duplicate submissions, out-of-order networks, worker process crashes, and flaky upstream verification.</p>
          
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invariant</th>
                  <th>Implementation Mechanism</th>
                  <th>Guaranteed Outcome</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Durable Acceptance</strong></td>
                  <td><code>POST /events</code> persists immediately to MongoDB before worker execution</td>
                  <td>Returns <code>202 Accepted</code> instantly; no dropped events on network disconnect</td>
                </tr>
                <tr>
                  <td><strong>Insert-First Idempotency</strong></td>
                  <td>Atomic <code>insertOne</code> against unique index <code>{tenantId, sourceId, eventId}</code></td>
                  <td>Same byte payload $\rightarrow$ <code>200 OK</code>; altered payload $\rightarrow$ <code>409 Conflict</code></td>
                </tr>
                <tr>
                  <td><strong>Monotonic Progression</strong></td>
                  <td>Atomic conditional write <code>{currentVersion: { $lt: incomingVersion }}</code></td>
                  <td>Highest successfully verified version wins; stale versions safely no-op</td>
                </tr>
                <tr>
                  <td><strong>Archive Tombstones</strong></td>
                  <td><code>archivedAtVersion = max(archivedAtVersion, incomingVersion)</code></td>
                  <td>Delayed resurrecting upserts with lower/equal versions are rejected</td>
                </tr>
                <tr>
                  <td><strong>Lease Recovery</strong></td>
                  <td>Atomic <code>findOneAndUpdate</code> with <code>leaseExpiresAt</code> claim boundary</td>
                  <td>Crashed workers auto-recover cleanly without double-processing side effects</td>
                </tr>
                <tr>
                  <td><strong>Strict Multi-Tenancy</strong></td>
                  <td>Every single MongoDB query and index scopes by <code>tenantId</code></td>
                  <td>Tenants cannot inspect, overwrite, or claim work across tenant boundaries</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="doc-section">
          <h2>📡 Complete REST API Contract</h2>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Route</th>
                  <th>Description</th>
                  <th>Expected Status Codes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>POST</code></td>
                  <td><code>/events</code></td>
                  <td>Ingest and queue job event for asynchronous verification and projection</td>
                  <td><code>202 Accepted</code>, <code>200 OK</code>, <code>409 Conflict</code>, <code>400 Bad Request</code></td>
                </tr>
                <tr>
                  <td><code>GET</code></td>
                  <td><code>/events/:eventId</code></td>
                  <td>Query event audit lifecycle, attempts count, lease expiry, and error log</td>
                  <td><code>200 OK</code>, <code>404 Not Found</code></td>
                </tr>
                <tr>
                  <td><code>GET</code></td>
                  <td><code>/jobs</code></td>
                  <td>List materialized job projections with cursor pagination and status filters</td>
                  <td><code>200 OK</code> (items + pageInfo)</td>
                </tr>
                <tr>
                  <td><code>GET</code></td>
                  <td><code>/health</code></td>
                  <td>Readiness & liveness health probe verifying MongoDB connection ping</td>
                  <td><code>200 OK</code> (checks.mongodb.status = ok)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="doc-section">
          <h2>💻 Direct Curl Examples</h2>
          <p>Copy and test these commands directly in your terminal:</p>
          <pre class="code-output" style="max-height:none; background:#07090f; padding:14px; border-radius:8px;">
# 1. Ingest Event
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-alpha",
    "sourceId": "main-portal",
    "eventId": "evt-curl-1",
    "externalJobId": "lead-architect",
    "version": 1,
    "operation": "upsert",
    "payload": {
      "title": "Lead Solutions Architect",
      "company": "Enterprise Cloud",
      "location": "Surat",
      "experienceMin": 5,
      "experienceMax": 10,
      "applyUrl": "https://example.test/jobs/lead",
      "skills": ["TypeScript", "MongoDB", "Docker"]
    }
  }'

# 2. Check Event Lifecycle Status
curl "http://localhost:3000/events/evt-curl-1?tenantId=tenant-alpha&sourceId=main-portal"

# 3. Query Materialized Jobs
curl "http://localhost:3000/jobs?tenantId=tenant-alpha&status=active&limit=10"

# 4. Service Health Probe
curl http://localhost:3000/health
          </pre>
        </div>

      </div>
    </section>
  </main>

  <script>
    // Tab Switching
    function switchTab(tab) {
      const playTab = document.getElementById('tab-playground');
      const docsTab = document.getElementById('tab-docs');
      const playBtn = document.getElementById('tab-playground-btn');
      const docsBtn = document.getElementById('tab-docs-btn');

      if (tab === 'playground') {
        playTab.classList.remove('hidden');
        docsTab.classList.add('hidden');
        playBtn.classList.add('active');
        docsBtn.classList.remove('active');
      } else {
        playTab.classList.add('hidden');
        docsTab.classList.remove('hidden');
        playBtn.classList.remove('active');
        docsBtn.classList.add('active');
      }
    }

    // Live Health Probe Telemetry Polling
    async function checkHealth() {
      const dot = document.getElementById('db-status-dot');
      const text = document.getElementById('db-status-text');
      const pill = document.getElementById('db-latency-pill');

      try {
        const start = performance.now();
        const res = await fetch('/health');
        const duration = Math.round(performance.now() - start);
        const data = await res.json();

        if (res.ok && data.status === 'ok') {
          dot.className = 'status-dot';
          const latency = data.checks?.mongodb?.latencyMs ?? duration;
          text.textContent = 'MongoDB: Connected';
          pill.textContent = latency + ' ms';
          pill.style.color = '#10b981';
        } else {
          dot.className = 'status-dot disconnected';
          text.textContent = 'MongoDB: Degraded';
          pill.textContent = 'Error';
          pill.style.color = '#ef4444';
        }
      } catch (err) {
        dot.className = 'status-dot disconnected';
        text.textContent = 'API Offline';
        pill.textContent = 'Offline';
        pill.style.color = '#ef4444';
      }
    }

    setInterval(checkHealth, 5000);
    checkHealth();

    // Preset Scenarios
    const PRESETS = {
      'valid-v1': {
        tenantId: 'tenant-alpha',
        sourceId: 'main-portal',
        eventId: 'evt-' + Date.now().toString().slice(-4),
        jobId: 'job-dev-ops',
        version: 1,
        operation: 'upsert',
        payload: {
          title: 'Senior DevOps Architect',
          company: 'Cloud Scale Inc',
          location: 'Surat',
          experienceMin: 3,
          experienceMax: 7,
          applyUrl: 'https://example.test/jobs/devops',
          skills: ['Docker', 'TypeScript', 'MongoDB']
        }
      },
      'replay': {
        tenantId: 'tenant-alpha',
        sourceId: 'main-portal',
        eventId: 'demo-evt-replay',
        jobId: 'job-replay-target',
        version: 1,
        operation: 'upsert',
        payload: {
          title: 'Staff Software Engineer',
          company: 'Acme Corp',
          location: 'Remote',
          experienceMin: 5,
          experienceMax: 9,
          applyUrl: 'https://example.test/jobs/staff',
          skills: ['TypeScript', 'Node.js']
        }
      },
      'conflict': {
        tenantId: 'tenant-alpha',
        sourceId: 'main-portal',
        eventId: 'demo-evt-replay',
        jobId: 'job-replay-target',
        version: 1,
        operation: 'upsert',
        payload: {
          title: 'ALTERED TITLE (Forces 409 Conflict)',
          company: 'Conflicting Entity',
          location: 'Remote',
          experienceMin: 1,
          experienceMax: 2,
          applyUrl: 'https://example.test/jobs/conflict',
          skills: ['Conflict']
        }
      },
      'ooo-v3': {
        tenantId: 'tenant-alpha',
        sourceId: 'main-portal',
        eventId: 'evt-ooo-v3-' + Date.now().toString().slice(-4),
        jobId: 'job-ooo-demo',
        version: 3,
        operation: 'upsert',
        payload: {
          title: 'Principal Engineer (Out-of-Order Version 3)',
          company: 'Hyper Scale',
          location: 'Bangalore',
          experienceMin: 8,
          experienceMax: 14,
          applyUrl: 'https://example.test/jobs/principal',
          skills: ['Distributed Systems', 'MongoDB']
        }
      },
      'archive': {
        tenantId: 'tenant-alpha',
        sourceId: 'main-portal',
        eventId: 'evt-arch-' + Date.now().toString().slice(-4),
        jobId: 'job-dev-ops',
        version: 2,
        operation: 'archive',
        payload: null
      },
      'whitespace': {
        tenantId: ' tenant-with-whitespace ',
        sourceId: 'main-portal',
        eventId: 'evt-ws-err',
        jobId: 'job-whitespace',
        version: 1,
        operation: 'upsert',
        payload: {
          title: 'Invalid Job',
          company: 'Co',
          location: 'L',
          experienceMin: 1,
          experienceMax: 2,
          applyUrl: 'https://example.test/jobs/1',
          skills: ['TypeScript']
        }
      }
    };

    function loadPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      document.getElementById('inp-tenantId').value = p.tenantId;
      document.getElementById('inp-sourceId').value = p.sourceId;
      document.getElementById('inp-eventId').value = p.eventId;
      document.getElementById('inp-jobId').value = p.jobId;
      document.getElementById('inp-version').value = p.version;
      document.getElementById('inp-operation').value = p.operation;
      document.getElementById('inp-payload').value = p.payload ? JSON.stringify(p.payload, null, 2) : '{}';
    }

    // Submit Event (POST /events)
    async function submitEvent() {
      const btn = document.getElementById('btn-submit-event');
      const badge = document.getElementById('post-status-badge');
      const durationSpan = document.getElementById('post-duration');
      const output = document.getElementById('post-response-output');

      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Persisting to MongoDB...';

      const tenantId = document.getElementById('inp-tenantId').value;
      const sourceId = document.getElementById('inp-sourceId').value;
      const eventId = document.getElementById('inp-eventId').value;
      const externalJobId = document.getElementById('inp-jobId').value;
      const version = parseInt(document.getElementById('inp-version').value, 10);
      const operation = document.getElementById('inp-operation').value;
      
      let payload = null;
      try {
        const rawPayload = document.getElementById('inp-payload').value.trim();
        if (rawPayload && rawPayload !== '{}') {
          payload = JSON.parse(rawPayload);
        }
      } catch (err) {
        output.textContent = 'JSON Syntax Error in Payload: ' + err.message;
        btn.disabled = false;
        btn.innerHTML = '<span>🚀</span> Dispatch Event to Ingestion Engine';
        return;
      }

      const body = { tenantId, sourceId, eventId, externalJobId, version, operation, payload };

      const t0 = performance.now();
      try {
        const res = await fetch('/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const elapsed = Math.round(performance.now() - t0);
        const data = await res.json();

        badge.style.display = 'inline-block';
        badge.textContent = res.status + ' ' + (res.status === 202 ? 'ACCEPTED' : res.status === 200 ? 'OK (REPLAY)' : res.status === 409 ? 'CONFLICT' : 'RESPONSE');
        badge.className = 'status-badge status-' + res.status;
        durationSpan.textContent = elapsed + 'ms';
        output.textContent = JSON.stringify(data, null, 2);

        // Pre-fill inspect inputs
        document.getElementById('inp-status-tenant').value = tenantId;
        document.getElementById('inp-status-source').value = sourceId;
        document.getElementById('inp-status-event').value = eventId;
        document.getElementById('inp-jobs-tenant').value = tenantId;

      } catch (err) {
        badge.style.display = 'inline-block';
        badge.className = 'status-badge status-500';
        badge.textContent = 'NETWORK_ERROR';
        output.textContent = 'Failed to connect to API: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🚀</span> Dispatch Event to Ingestion Engine';
      }
    }

    // Inspect Event Status (GET /events/:eventId)
    async function fetchEventStatus() {
      const tenant = document.getElementById('inp-status-tenant').value.trim();
      const source = document.getElementById('inp-status-source').value.trim();
      const eventId = document.getElementById('inp-status-event').value.trim();
      const output = document.getElementById('event-status-output');
      const badge = document.getElementById('event-state-badge');

      if (!tenant || !source || !eventId) {
        output.textContent = 'Please fill Tenant ID, Source ID, and Event ID.';
        return;
      }

      output.textContent = 'Querying event audit record...';

      try {
        const res = await fetch('/events/' + encodeURIComponent(eventId) + '?tenantId=' + encodeURIComponent(tenant) + '&sourceId=' + encodeURIComponent(source));
        const data = await res.json();

        badge.style.display = 'inline-block';
        if (res.ok && data.status) {
          badge.textContent = data.status.toUpperCase();
          badge.className = 'status-badge ' + (data.status === 'completed' ? 'status-200' : data.status === 'claimed' ? 'status-409' : data.status === 'failed' ? 'status-400' : 'status-202');
        } else {
          badge.textContent = res.status;
          badge.className = 'status-badge status-' + res.status;
        }

        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = 'Error: ' + err.message;
      }
    }

    // Query Jobs (GET /jobs)
    async function fetchJobs() {
      const tenant = document.getElementById('inp-jobs-tenant').value.trim();
      const status = document.getElementById('inp-jobs-status').value;
      const limit = document.getElementById('inp-jobs-limit').value || 10;
      const container = document.getElementById('jobs-cards-container');

      if (!tenant) {
        container.innerHTML = '<div style="color:var(--error); text-align:center; padding:1rem;">Tenant ID is required.</div>';
        return;
      }

      container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:1rem;">Loading projections...</div>';

      try {
        const res = await fetch('/jobs?tenantId=' + encodeURIComponent(tenant) + '&status=' + encodeURIComponent(status) + '&limit=' + limit);
        const data = await res.json();

        if (!res.ok) {
          container.innerHTML = '<div style="color:var(--error); padding:1rem;">' + (data.error?.message || 'Error querying jobs') + '</div>';
          return;
        }

        if (!data.items || data.items.length === 0) {
          container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:2rem 1rem;">No jobs found for tenant <strong>' + tenant + '</strong>. Dispatch an event to project a job!</div>';
          return;
        }

        let html = '';
        for (const job of data.items) {
          const isArchived = job.status === 'archived';
          const skillsHtml = job.payload?.skills?.map(s => '<span class="skill-pill">' + s + '</span>').join('') || '';

          html += '<div class="job-card">' +
            '<div class="job-card-header">' +
              '<span class="job-title">' + (job.payload?.title || job.externalJobId) + '</span>' +
              '<span class="status-badge ' + (isArchived ? 'status-409' : 'status-200') + '">' + job.status.toUpperCase() + ' (v' + job.currentVersion + ')</span>' +
            '</div>' +
            '<div class="job-meta">' +
              '<span>' + (job.payload?.company || 'ID: ' + job.externalJobId) + '</span>' +
              '&bull; <span>' + (job.payload?.location || 'Tenant: ' + job.tenantId) + '</span>' +
              (job.payload?.experienceMin !== undefined ? '&bull; <span>' + job.payload.experienceMin + '-' + job.payload.experienceMax + ' yrs exp</span>' : '') +
            '</div>' +
            (skillsHtml ? '<div class="skills-row">' + skillsHtml + '</div>' : '') +
          '</div>';
        }

        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = '<div style="color:var(--error); padding:1rem;">Failed to fetch jobs: ' + err.message + '</div>';
      }
    }

    // Toast Notification Banner
    function showToast(message, isError = false) {
      let toast = document.getElementById('toast-banner');
      if (!toast) return;
      toast.textContent = message;
      toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
      toast.style.color = isError ? '#f87171' : '#34d399';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 4500);
    }

    // Clear All Records from Database
    async function clearDatabase() {
      const choice = confirm(
        '⚠️ Are you sure you want to clear the database?\\n\\n' +
        '• This will permanently DELETE all events and job projections across all tenants.\\n' +
        '• Click OK to proceed, or Cancel to abort.'
      );
      if (!choice) return;

      const btn = document.getElementById('btn-clear-db');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Purging...';

      try {
        const res = await fetch('/admin/clear-db', { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.success) {
          showToast('✅ Database purged! Removed ' + data.deletedEvents + ' events and ' + data.deletedJobs + ' jobs.');
          document.getElementById('post-response-output').textContent = '// Database cleared at ' + new Date().toLocaleTimeString() + '\\n' + JSON.stringify(data, null, 2);
          document.getElementById('event-status-output').textContent = '// Database was cleared.';
          const badge = document.getElementById('event-state-badge');
          if (badge) badge.style.display = 'none';
          document.getElementById('jobs-cards-container').innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:2rem 1rem;">Database is clean and empty. Dispatch an event to project a new job!</div>';
        } else {
          showToast('❌ Failed to clear database: ' + (data.error?.message || 'Server error'), true);
        }
      } catch (err) {
        showToast('❌ Network error: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🗑️</span> Clear DB';
      }
    }

    // Clear Specific Tenant Records
    async function clearTenantRecords() {
      const tenant = document.getElementById('inp-jobs-tenant')?.value?.trim();
      if (!tenant) {
        showToast('❌ Please specify a Tenant ID to clear', true);
        return;
      }

      const choice = confirm('⚠️ Delete all events and job projections for tenant "' + tenant + '"?');
      if (!choice) return;

      try {
        const res = await fetch('/admin/clear-db?tenantId=' + encodeURIComponent(tenant), { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.success) {
          showToast('✅ Cleared tenant "' + tenant + '": ' + data.deletedEvents + ' events, ' + data.deletedJobs + ' jobs deleted.');
          fetchJobs();
        } else {
          showToast('❌ Failed: ' + (data.error?.message || 'Server error'), true);
        }
      } catch (err) {
        showToast('❌ Network error: ' + err.message, true);
      }
    }
  </script>
  <div id="toast-banner" class="toast-banner"></div>
</body>
</html>
`;
}
