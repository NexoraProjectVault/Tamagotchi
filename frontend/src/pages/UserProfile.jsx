import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UserProfile.css";

const baseUrl = import.meta.env.VITE_API_GATEWAY_URL; // API Gateway to user service
// ^ keep your latest setup :contentReference[oaicite:4]{index=4}

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'unauth' | 'error'
  const [msg, setMsg] = useState("");

  // edit-mode state
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  // password modal state
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const onPasswordSubmit = async () => {
    if (!pwdForm.current_password || !pwdForm.new_password || !pwdForm.confirm) {
      setPwdMsg("All fields are required.");
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm) {
      setPwdMsg("New passwords do not match.");
      return;
    }
    if (pwdForm.new_password.length < 8) {
      setPwdMsg("New password must be at least 8 characters.");
      return;
    }

    setPwdLoading(true);
    setPwdMsg("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${baseUrl}/v1/user-service/users/me/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: pwdForm.current_password,
          new_password: pwdForm.new_password,
        }),
      });

      if (res.status === 401) {
        clearAuth();
        setStatus("unauth");
        setMsg("Your session expired. Please sign in again.");
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Password update failed.");

      setPwdMsg("Password updated ✅");
      setPwdForm({ current_password: "", new_password: "", confirm: "" });
      setTimeout(() => setShowPwd(false), 1200);
    } catch (e) {
      setPwdMsg(e.message);
    } finally {
      setPwdLoading(false);
    }
  }

  const clearAuth = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
  };

  const goLogin = () => {
    clearAuth();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setStatus("unauth");
      setMsg("No access token found. Please sign in.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/v1/user-service/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearAuth();
          setStatus("unauth");
          setMsg("Your session expired. Please sign in again.");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed: ${res.status}`);
        }

        const data = await res.json();
        setUser(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
        });
        setStatus("ready");
      } catch (e) {
        setStatus("error");
        setMsg(e.message || "Something went wrong loading your profile.");
      }
    })();
  }, []);

  // Small helpers
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
  const displayName = user?.name?.trim() || "Pixel Nova";
  const displayId = user?.id != null ? `#${user.id}` : "—";

  // track changes vs. loaded user
  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      (form.name || "") !== (user.name || "") ||
      (form.phone || "") !== (user.phone || "") ||
      (form.address || "") !== (user.address || "")
    );
  }, [form, user]);

  // mirror backend limits: name≤100, phone≤15, address≤255 (see routes) :contentReference[oaicite:6]{index=6}
  const validate = () => {
    if (form.name && form.name.length > 100) return "Name must be ≤ 100 chars.";
    if (form.phone && form.phone.length > 15) return "Phone must be ≤ 15 chars.";
    if (form.address && form.address.length > 255) return "Address must be ≤ 255 chars.";
    return "";
  };

  const onSave = async () => {
    const err = validate();
    if (err) { setNote(err); return; }
    if (!dirty) { setEdit(false); return; }

    setSaving(true);
    setNote("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${baseUrl}/v1/user-service/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name || null,
          phone: form.phone || null,
          address: form.address || null,
        }),
      }); // backend accepts exactly these fields :contentReference[oaicite:7]{index=7}

      if (res.status === 401) {
        clearAuth();
        setStatus("unauth");
        setMsg("Your session expired. Please sign in again.");
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Update failed.");

      // backend returns the full, updated profile (id/name/email/phone/address/timestamps) :contentReference[oaicite:8]{index=8}
      setUser(body);
      setForm({ name: body.name || "", phone: body.phone || "", address: body.address || "" });
      setEdit(false);
      setNote("Profile updated ✅");
    } catch (e) {
      setNote(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    if (user) {
      setForm({ name: user.name || "", phone: user.phone || "", address: user.address || "" });
    }
    setEdit(false);
    setNote("");
  };

  if (status === "loading") {
    return (
      <div className="profile-page">
        <section className="profile-hero">
          <div className="hero-left">
            <div className="avatar-xl" aria-hidden />
            <div className="hero-texts">
              <h1 className="hero-title">Loading profile…</h1>
              <p className="hero-sub">Fetching your settings and stats.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (status === "unauth" || status === "error") {
    return (
      <div className="profile-page">
        <section className="profile-hero">
          <div className="hero-left">
            <div className="avatar-xl" aria-hidden />
            <div className="hero-texts">
              <h1 className="hero-title">User Profile</h1>
              <p className="hero-sub">{msg}</p>
            </div>
          </div>
            <div className="hero-right">
              <button className="btn-black" onClick={goLogin}>
                Go to Login
              </button>
            </div>
        </section>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* ==== Header ==== */}
      <section className="profile-hero">
        <div className="hero-left">
          <div className="avatar-xl" aria-hidden />
          <div className="hero-texts">
            <h1 className="hero-title">{displayName}</h1>
            <div className="chips">
              <span className="chip">User ID: {displayId}</span>
              <span className="chip">Joined: {fmt(user.created_at)}</span>
              <span className="chip">Updated: {fmt(user.updated_at)}</span>
            </div>
            <p className="hero-sub">Take care of your Tamagotchi by completing tasks!</p>
            {note && <div className="inline-note">{note}</div>}
          </div>
        </div>
        <div className="hero-right">
          {!edit ? (
            <>
              <button className="btn-black" onClick={() => setEdit(true)}>
                Edit Profile
              </button>
              <button
                className="btn-ghost"
                style={{ marginLeft: "10px" }}
                onClick={() => setShowPwd(true)}
              >
                Update Password
              </button>
            </>
          ) : (
            <div className="edit-actions">
              <button
                className="btn-black"
                onClick={onSave}
                disabled={saving || !dirty || !!validate()}
                title={!dirty ? "No changes" : validate() || ""}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="btn-ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== Account ===== */}
      <section className="profile-section">
        <div className="section-left">
          <h2 className="section-title">Account</h2>
        </div>
        <div className="section-right">
          <Row icon="✉️" title="Email" value={<span className="row-value">{user.email || "—"}</span>} />
          <Row
            icon="📛"
            title="Name"
            value={
              !edit ? (
                <span className="row-value">{user.name || "—"}</span>
              ) : (
                <input
                  className="input"
                  placeholder="Your name"
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              )
            }
          />
          <Row
            icon="📱"
            title="Phone"
            value={
              !edit ? (
                <span className="row-value">{user.phone || "—"}</span>
              ) : (
                <input
                  className="input"
                  placeholder="(123) 456-7890"
                  value={form.phone}
                  maxLength={15}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              )
            }
          />
          <Row
            icon="🏠"
            title="Address"
            value={
              !edit ? (
                <span className="row-value">{user.address || "—"}</span>
              ) : (
                <input
                  className="input"
                  placeholder="123 Pixel St"
                  value={form.address}
                  maxLength={255}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              )
            }
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
          <h2 className="section-title">Other</h2>
        </div>
        <div className="section-right">
          <Row icon="🔔" title="Notifications Frequency" value={<span className="hint">[Dropdown]</span>} />
          <Row icon="🕘" title="Timezone" value={<span className="hint">[Dropdown]</span>} />
          {/* <Row icon="🔑" title="Change Password" value={ <button className="btn-ghost" onClick={() => setShowPwd(true)}> Update </button> } /> */}
          <Row icon="🎨" title="Theme" value={<span className="hint">[Light/Dark]</span>} last />
        </div>
      </section>
      
      {/* the overlay modal */}
      {showPwd && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Update Password</h2>
            <input
              className="input full"
              type="password"
              placeholder="Current Password"
              value={pwdForm.current_password}
              onChange={(e) => setPwdForm((f) => ({ ...f, current_password: e.target.value }))}
            />
            <input
              className="input full"
              type="password"
              placeholder="New Password"
              value={pwdForm.new_password}
              onChange={(e) => setPwdForm((f) => ({ ...f, new_password: e.target.value }))}
            />
            <input
              className="input full"
              type="password"
              placeholder="Confirm New Password"
              value={pwdForm.confirm}
              onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
            />
            {pwdMsg && <div className="inline-note">{pwdMsg}</div>}
            <div className="edit-actions">
              <button className="btn-black" onClick={onPasswordSubmit} disabled={pwdLoading}>
                {pwdLoading ? "Updating…" : "Save Password"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setPwdForm({ current_password: "", new_password: "", confirm: "" });
                  setPwdMsg("");
                  setShowPwd(false);
                }}
                disabled={pwdLoading}
              >
                Cancel
              </button>
            </div>
          </div>
      </div>
      )}
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
