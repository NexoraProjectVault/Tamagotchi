// src/pages/PetOverview.jsx
import React from "react";
import "./PetOverview.css";

export default function PetOverview() {
  return (
    <div className="po-page">
      {/* ===== Top hero ===== */}
      <section className="po-hero">
        <h1 className="po-title">Name</h1>
        <div className="po-avatar-box">
          <div className="po-avatar-placeholder">Tamagotchi</div>
        </div>

        <div className="po-meta">
          <p className="po-species">Species: Cat</p>
          <input
            className="po-level-input"
            value="Level: 5"
            onChange={() => {}}
            readOnly
          />
          <button className="po-xp-btn">XP: 150/300</button>
        </div>
      </section>

      {/* ===== Pet Status ===== */}
      <section className="po-section">
        <h2 className="po-section-title">Pet Status</h2>
        <div className="po-status-grid">
          <div className="po-status-card">
            <div className="po-status-img" />
            <div>
              <div className="po-status-name">Hunger</div>
              <div className="po-status-value">🌞 75%</div>
            </div>
          </div>
          <div className="po-status-card">
            <div className="po-status-img" />
            <div>
              <div className="po-status-name">Happiness</div>
              <div className="po-status-value">😊 80%</div>
            </div>
          </div>
          <div className="po-status-card po-status-wide">
            <div className="po-status-img" />
            <div>
              <div className="po-status-name">Energy</div>
              <div className="po-status-value">⚡ 60%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Actions ===== */}
      <section className="po-section">
        <h2 className="po-section-title">Actions</h2>
        <div className="po-actions-grid">
          <div className="po-action-card">
            <span className="po-badge-muted">disabled</span>
            <div className="po-action-body">Feed your Tamagotchi</div>
            <div className="po-action-footer">Feed</div>
          </div>
          <div className="po-action-card">
            <span className="po-badge-muted">disabled</span>
            <div className="po-action-body">Play with your Tamagotchi</div>
            <div className="po-action-footer">Play</div>
          </div>
          <div className="po-action-card">
            <span className="po-badge-muted">disabled</span>
            <div className="po-action-body">Clean your Tamagotchi's space</div>
            <div className="po-action-footer">Clean</div>
          </div>
        </div>
      </section>

      {/* ===== Evolution row ===== */}
      <section className="po-evo-row">
        <div className="po-evo-left">
          <div className="po-evo-circle" />
          <div className="po-evo-text">Evolution Conditions</div>
        </div>
        <button className="po-evo-btn">Checklist</button>
      </section>
    </div>
  );
}
