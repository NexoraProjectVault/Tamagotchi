// src/components/FloatingQuickSwitch.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import "./FloatingQuickSwitch.css";

const MENU_ITEMS = [
  { key: "home", label: "Home", path: "/" },
  { key: "tasks", label: "Task Manager", path: "/tasks" },
  { key: "pet", label: "Pet Manager", path: "/pet-overview" },
  { key: "profile", label: "Profile", path: "/user" },
];

export default function FloatingQuickSwitch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGo = (path) => {
    setOpen(false);
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    setOpen(false);
    navigate("/login");
  };

  const handlePrevious = () => {
    setOpen(false);

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return createPortal(
    <>
      <button
        className={`fq-fab ${open ? "is-open" : ""}`}
        style={{
          position: "fixed",
          right: "26px",
          bottom: "26px",
          zIndex: 4000,
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open quick switch"
      >
        {open ? "×" : "≡"}
      </button>

      {open && (
        <>
          <div className="fq-backdrop" onClick={() => setOpen(false)} />
          <div className="fq-panel">
            <h3 className="fq-title">Quick switch</h3>
            <p className="fq-sub">Pick a page to jump to</p>

            <div className="fq-list">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  className={`fq-item ${
                    location.pathname === item.path ? "active" : ""
                  }`}
                  onClick={() => handleGo(item.path)}
                >
                  <span className="fq-item-label">{item.label}</span>
                  <span className="fq-item-arrow">→</span>
                </button>
              ))}

              {/* === Divider === */}
              <div
                style={{
                  height: "1px",
                  background: "rgba(0,0,0,0.1)",
                  margin: "10px 0 6px 0",
                }}
              />

              {/* === 🔙 Return to Previous Page === */}
              <button
                className="fq-item"
                onClick={handlePrevious}
              >
                <span
                  className="fq-item-label"
                  style={{ fontWeight: 600 }}
                >
                  Return to Previous
                </span>
                <span className="fq-item-arrow">↩</span>
              </button>

              {/* === 🔥 Logout === */}
              <button
                className="fq-item logout-item"
                onClick={handleLogout}
                style={{ marginTop: "8px" }}
              >
                <span
                  className="fq-item-label"
                  style={{ color: "#b91c1c", fontWeight: 600 }}
                >
                  Logout
                </span>
                <span
                  className="fq-item-arrow"
                  style={{ color: "#b91c1c" }}
                >
                  →
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
