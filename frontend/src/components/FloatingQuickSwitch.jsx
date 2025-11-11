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

  return createPortal(
    <>
      <button
        className={`fq-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open quick switch"
      >
        {open ? "×" : "≡"}
      </button>

      {open && (
        <>
          <div
            className="fq-backdrop"
            onClick={() => setOpen(false)}
          />
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
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
