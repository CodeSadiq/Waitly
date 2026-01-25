import React from "react";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  return (
    <div className="staff-page">
      {/* Header */}
      <header className="staff-header">
        <div className="place-info">
          <h2 className="place-name">SBI Connaught Place</h2>
        </div>

        {/* Empty spacer for balance */}
        <div className="header-spacer"></div>
      </header>

      {/* Main Content */}
      <div className="staff-content">
        {/* Current Token Card */}
        <div className="staff-card">
          <h3 className="card-title">CURRENT TOKEN 18 </h3>

          <div className="token-box">
            <h1 className="token-code">B7G9JR</h1>
            <div className="qr-box">QR</div>
          </div>
        </div>

        {/* Queue Summary */}
        <div className="staff-card">
          <h3 className="card-title">QUEUE</h3>

          <div className="queue-row">
            <span>Waiting</span>
            <span className="queue-waiting">14</span>
          </div>

          <div className="queue-row">
            <span>Near</span>
            <span className="queue-near">3</span>
          </div>

          <div className="queue-row">
            <span>Completed</span>
            <span className="queue-completed">10</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="staff-actions">
        <button className="action-btn btn-complete">
          Mark as Completed
        </button>

        <button className="action-btn btn-skip">
          Skip
        </button>

        <button className="action-btn btn-scan">
          Scan Token
        </button>
      </div>
    </div>
  );
}
