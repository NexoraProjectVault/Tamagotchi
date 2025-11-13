// src/pages/Welcome.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  function handleStart() {
    const token = localStorage.getItem("access_token");

    if (token) {
      navigate("/");
    } else {
      navigate("/login");
    }
  }

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <h1 className="welcome-title">Welcome to Pixel Pet</h1>
        <p className="welcome-sub">
          Take care of your pet by completing your daily tasks!
        </p>

        <button className="welcome-btn" onClick={handleStart}>
          Start
        </button>
      </div>
    </div>
  );
}
