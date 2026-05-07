export default function AdminHomePage() {
  return (
    <div className="a-grid">
      <div className="a-card a-col-12">
        <h1 className="a-h1">Overview</h1>
        <p className="a-p">Create staff, create camps, upload roster, and export registrations.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="a-badge">One camp = one employer</div>
          <div className="a-badge">Staff mobile registration</div>
          <div className="a-badge">CSV export (Excel)</div>
          <div className="a-badge">Admin & staff: email/password</div>
        </div>
      </div>
    </div>
  );
}

