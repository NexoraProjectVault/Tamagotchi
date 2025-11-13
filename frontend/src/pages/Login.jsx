// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const baseUrl = import.meta.env.API_GATEWAY_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/v1/user-service/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Login failed");

      // backend returns: { access_token, user: { id, email } }
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", data.user?.email || "");
      localStorage.setItem("user_id", String(data.user?.id || ""));
      navigate("/"); // go home on success
    } catch (e) {
      setErr(e.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Welcome</h2>
          <p className="login-sub">
            Are you ready for a nice day to begin?!
          </p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
            />
          </div>

          {err && <div className="login-error">{err}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <div className="login-footer">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
