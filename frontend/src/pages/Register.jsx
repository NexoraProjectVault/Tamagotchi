// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";
const baseUrl = import.meta.env.API_GATEWAY_URL;

export default function Register() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (pwd !== pwd2) { setErr("Passwords do not match"); return; }
    setLoading(true);

    try {
      const r = await fetch(`${baseUrl}/v1/user-service/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Registration failed");

      const r2 = await fetch(`${baseUrl}/v1/user-service/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      const data2 = await r2.json();
      if (!r2.ok) throw new Error(data2?.error || "Auto-login failed");

      localStorage.setItem("access_token", data2.access_token);
      localStorage.setItem("user_email", data2.user?.email || email);
      localStorage.setItem("user_id", String(data2.user?.id || ""));
      navigate("/select-pet");
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="login-card">

        <h2 className="login-title">Create an account</h2>
        <p className="login-sub">Please fill in your details</p>

        <div className="login-field">
          <label className="login-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label">Password</label>
          <input
            type="password"
            value={pwd}
            onChange={e=>setPwd(e.target.value)}
            className="login-input"
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label">Confirm Password</label>
          <input
            type="password"
            value={pwd2}
            onChange={e=>setPwd2(e.target.value)}
            className="login-input"
            required
          />
        </div>

        {err && <div className="login-error">{err}</div>}

        <button type="submit" disabled={loading} className="login-btn">
          {loading ? "Creating…" : "Create Account"}
        </button>

        <div className="login-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>

      </form>
    </div>
  );
}
