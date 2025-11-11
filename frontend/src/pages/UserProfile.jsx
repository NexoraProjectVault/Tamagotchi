// src/pages/UserProfile.jsx
import React from "react";
import "./UserProfile.css";

export default function UserProfile() {
  const user = {
    name: "User's Tamagotchi",
    username: "@username",
    uid: "#123456",
    email: "user@example.com",
  };

  return (
    <div className="profile-page">
      {/* ==== ===== */}
      <section className="profile-hero">
        <div className="hero-left">
          <div className="avatar-xl" aria-hidden />
          <div className="hero-texts">
            <h1 className="hero-title">{user.name}</h1>
            <div className="chips">
              <span className="chip">Username: {user.username}</span>
              <span className="chip">Unique ID: {user.uid}</span>
            </div>
            <p className="hero-sub">Take care of your Tamagotchi by completing tasks!</p>
          </div>
        </div>
        <div className="hero-right">
          <button className="btn-black">Edit Profile</button>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== Account ===== */}
      <section className="profile-section">
        <div className="section-left">
          <h2 className="section-title">Account</h2>
        </div>
        <div className="section-right">
          <Row icon="✉️" title="Email" value={<span className="row-value">{user.email}</span>} />
          <Row icon="🔑" title="Change Password" value={<span className="hint">Button</span>} />
          <Row
            icon="🔗"
            title="OAuth Providers"
            value={<span className="hint">Google - [ ] | GitHub - [ ]</span>}
            last
          />
        </div>
      </section>

      {/* ===== Privacy ===== */}
      <section className="profile-section">
        <div className="section-left">
          <h2 className="section-title">Privacy</h2>
        </div>
        <div className="section-right">
          <Row
            icon="🔒"
            title="Sharing"
            value={<span className="hint">Public / Friends / Private (radio)</span>}
          />
          <Row icon="📊" title="Show Streaks" value={<span className="hint">[Toggle]</span>} />
          <Row icon="🤝" title="Show Shared Cards" value={<span className="hint">[Toggle]</span>} last />
        </div>
      </section>

      {/* ===== Preferences ===== */}
      <section className="profile-section">
        <div className="section-left">
          <h2 className="section-title">Preferences</h2>
        </div>
        <div className="section-right">
          <Row icon="🔔" title="Notifications Frequency" value={<span className="hint">[Dropdown]</span>} />
          <Row icon="🕘" title="Timezone" value={<span className="hint">[Dropdown]</span>} />
          <Row icon="🎨" title="Theme" value={<span className="hint">[Light/Dark]</span>} last />
        </div>
      </section>
    </div>
  );
}

function Row({ icon, title, value, last = false }) {
  return (
    <div className={`row ${last ? "row-last" : ""}`}>
      <div className="row-left">
        <div className="icon-bubble" aria-hidden>{icon}</div>
        <div className="row-title">{title}</div>
      </div>
      <div className="row-right">{value}</div>
      {!last && <div className="row-divider" />}
    </div>
  );
}
