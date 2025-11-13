// src/pages/PetOverview.jsx
// -----------------------------------------------------------------------------
// PetOverview
// High-level UI for a single virtual pet:
// - Loads pet profile, current status, and action-point balances from the API.
// - Polls for updates on an interval.
// - Triggers backend actions (feed/play/clean) that spend points and may level up.
// - Shows a lightweight "Level Up" modal when the pet gains a level.
//
// Notes
// -----
// • All network endpoints are read from VITE_BACKEND_URL (fallback: http://localhost:5000).
// • Keep POINT_COST_PER_ACTION in sync with the backend cost to avoid UX mismatch.
// -----------------------------------------------------------------------------

// --- shared fetch helpers for other components (e.g., PetSnapshotCard) ---
export const PET_API_BASE =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (userId) {
    headers["X-User-Id"] = userId;
  }
  return headers;
};

export async function fetchPetMe() {
  const res = await fetch(`${PET_API_BASE}/v1/pet-service/pets/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load pet: ${res.statusText}`);
  return res.json();
}

export async function fetchPetStatus() {
  const res = await fetch(`${PET_API_BASE}/v1/pet-service/pets/me/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load status: ${res.statusText}`);
  return res.json();
}

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PetOverview.css";
import PetChecklistModal from "../components/PetChecklistModal.jsx";

//import pet status images
import hungerIcon from "../assets/pet_status/hunger.png";
import happinessIcon from "../assets/pet_status/happiness.png";
import energyIcon from "../assets/pet_status/energy.png";

// Cost to perform a single action (feed/play/clean).
// IMPORTANT: Must match the server-side value to prevent user confusion.
const POINT_COST_PER_ACTION = 1; // keep in sync with backend

export default function PetOverview() {
  const navigate = useNavigate();
  // API base URL; uses env var if present, otherwise dev default.
  const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Minimal pet shape so the UI has safe defaults before the first fetch.
  const [pet, setPet] = useState({
    id: null,
    name: "Name",
    breed: "Dragon",
    hunger: 50,
    happiness: 50,
    energy: 50,
    level: 1,
    xp: 0,
    xp_to_next: 100,
  });

  // Action-point balances; totalsLoaded gates first render vs. real data.
  const [points, setPoints] = useState({
    feeding: 0,
    playing: 0,
    cleaning: 0,
    totalsLoaded: false,
  });

  // Simple UI flags and error surface.
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ===== Level-up modal state =====
  const [showLevelup, setShowLevelup] = useState(false);
  // levelRef mirrors the last-known level to detect an increase after updates.
  const levelRef = useRef(pet.level);

  // XP progress percent for the button display; guarded against divide-by-zero.
  const progress = useMemo(() => {
    const need = Number(pet.xp_to_next || 0) || 1;
    return Math.min(100, Math.round((Number(pet.xp || 0) / need) * 100));
  }, [pet.xp, pet.xp_to_next]);

  // Resolve the pet image based on breed and level; falls back to a generic sprite.
  const getPetImage = () => {
    const lvl = Math.max(0, Math.min(9, Number(pet.level || 0)));
    try {
      return new URL(`../assets/pets/${pet.breed}/${lvl}.png`, import.meta.url)
        .href;
    } catch {
      // If the breed folder or file is missing, display a generic image.
      return new URL(`../assets/pets/Generic/0.png`, import.meta.url).href;
    }
  };

  // Fetch the current user's pet profile (static-ish fields + some stats).
  const fetchMe = async () => {
    try {
      const res = await fetch(`${baseUrl}/v1/pet-service/pets/me`, {
        headers: getAuthHeaders(), 
      });
      if (!res.ok) throw new Error(`Failed to load pet: ${res.statusText}`);
      const data = await res.json();

      // Keep ref in sync for level-change detection across calls.
      levelRef.current = data.level ?? levelRef.current;

      // Merge to avoid dropping default values when fields are missing.
      setPet((prev) => ({
        ...prev,
        ...data,
        xp_to_next: data.xp_to_next ?? prev.xp_to_next,
      }));
    } catch (e) {
      console.error(e);
      setErr(e.message || "Unable to load pet.");
    }
  };

  // Fetch the frequently changing status (stats/xp/level). Detect level-ups.
  const fetchStatus = async () => {
    try {
      const beforeLevel = Number(levelRef.current || 0);
      const res = await fetch(`${baseUrl}/v1/pet-service/pets/me/status`, {
        headers: getAuthHeaders(), 
      });
      if (!res.ok) throw new Error(`Failed to load status: ${res.statusText}`);
      const s = await res.json();

      setPet((prev) => {
        // Merge incoming values with existing state to keep non-status fields intact.
        const next = {
          ...prev,
          hunger: s.hunger ?? prev.hunger,
          happiness: s.happiness ?? prev.happiness,
          energy: s.energy ?? prev.energy,
          level: s.level ?? prev.level,
          xp: s.xp ?? prev.xp,
          xp_to_next: s.xp_to_next ?? prev.xp_to_next,
        };

        // Level-up detection (drives modal).
        const afterLevel = Number(next.level || 0);
        if (afterLevel > beforeLevel) {
          levelRef.current = afterLevel;
          openLevelupModal();
        } else {
          levelRef.current = afterLevel;
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      setErr(e.message || "Unable to load status.");
    }
  };

  // Fetch action-point totals for all categories.
  const fetchPoints = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/v1/pet-service/pets/me/points`, {
        headers: getAuthHeaders(), 
      });
      if (!res.ok) throw new Error(`Failed to load points: ${res.statusText}`);
      const data = await res.json();
      setPoints({ ...data, totalsLoaded: true });
    } catch (e) {
      console.error(e);
      setErr(e.message || "Unable to load points.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load: profile first (so we know breed/level), then status/points.
  useEffect(() => {
    fetchMe().then(() => {
      fetchStatus();
      fetchPoints();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background polling: keep UI fresh without manual refresh.
  useEffect(() => {
    const id = setInterval(() => {
      fetchStatus();
      fetchPoints();
    }, 30000); // 30s cadence; adjust if backend load is a concern.
    return () => clearInterval(id);
  }, []);

  // Navigate to the task manager (source of points/xp).
  const goManageTasks = () => navigate("/tasks/manage");

  // Show "Level Up" modal briefly; also allows manual dismissal via click.
  const openLevelupModal = () => {
    setShowLevelup(true);
    // Auto-close after ~1.5s to avoid blocking UX.
    setTimeout(() => setShowLevelup(false), 2500);
  };

  // Execute an action on the backend; handles common error messages and
  // re-fetches point totals after a successful spend. Also triggers level-up UI.
  const doAction = async (action /* 'feed' | 'play' | 'clean' */) => {
    try {
      const beforeLevel = Number(levelRef.current || 0);
      const res = await fetch(
        `${baseUrl}/v1/pet-service/pets/me/actions/${action}`,
        {
          method: "POST",
          headers: getAuthHeaders(), 
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        if (txt && txt.includes("insufficient_points")) {
          throw new Error("Not enough points for that action.");
        }
        throw new Error(`Action failed: ${txt || res.statusText}`);
      }

      // Expect shape { pet: {...updated fields...} }
      const data = await res.json();
      const updatedPet = data?.pet || {};

      setPet((prev) => {
        const next = { ...prev, ...updatedPet };
        const afterLevel = Number(next.level || 0);
        if (afterLevel > beforeLevel) {
          levelRef.current = afterLevel;
          openLevelupModal();
        } else {
          levelRef.current = afterLevel;
        }
        return next;
      });

      // Refresh point balances after a spend to reflect the new totals.
      fetchPoints();
    } catch (e) {
      console.error(e);
      // Keep user-facing feedback brief and actionable.
      alert(e.message || "Could not apply action.");
    }
  };

  const [showChecklist, setShowChecklist] = useState(false);
  return (
    <div className="po-page">
      {/* ===== Level-up GIF Modal =====
          Shown briefly when a level increase is detected.
          Click outside or "Nice!" to close immediately.
      */}
      {showLevelup && (
        <div
          className="po-modal-backdrop"
          onClick={() => setShowLevelup(false)}
        >
          <div className="po-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-head">
              <h3 className="po-modal-title">Level Up!</h3>
            </div>
            <div className="po-modal-body">
              <img
                className="po-modal-gif"
                src={
                  new URL(
                    "../assets/levelup/levelup.gif",
                    import.meta.url
                  ).href
                }
                alt="Level up animation"
              />
              <div className="po-modal-note">
                Your pet advanced to level {pet.level} 🎉
              </div>
            </div>
            <div className="po-modal-foot">
              <button
                className="po-modal-btn"
                onClick={() => setShowLevelup(false)}
              >
                Nice!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Top hero =====
          Displays the primary avatar, name, and quick XP summary.
      */}
      <section className="po-hero">
        <h1 className="po-title">{pet.name}</h1>

        <div className="po-avatar-box">
          <img
            src={getPetImage()}
            alt={`${pet.breed} level ${pet.level}`}
            className="po-avatar-img"
            style={{
              width: 460,
              height: 360,
              objectFit: "contain",
              borderRadius: 8,
              background: "#e9e9e9",
            }}
          />
        </div>

        <div className="po-meta">
          <p className="po-breed">breed: {pet.breed}</p>
          {/* Read-only display to mimic input styling used elsewhere */}
          <input
            className="po-level-input"
            value={`Level: ${pet.level}`}
            readOnly
          />
          <button
            className="po-xp-btn"
            onClick={goManageTasks}
            title="Complete tasks to earn more XP"
          >
            {/* Button shows both raw XP and % progress */}
            XP: {pet.xp}/{pet.xp_to_next} ({progress}%)
          </button>
        </div>
      </section>

      {/* ===== Pet Status =====
          Three-card grid for high-level stat readouts.
      */}
      <section className="po-section">
        <h2 className="po-section-title">Pet Status</h2>
        <div className="po-status-grid">
          <div className="po-status-card">
            <img
              className="po-status-img"
              src={hungerIcon}
              alt="Hunger icon"
            />
            <div>
              <div className="po-status-name">Hunger</div>
              <div className="po-status-value">🌞 {pet.hunger}%</div>
            </div>
          </div>
          <div className="po-status-card">
            <img
              className="po-status-img"
              src={happinessIcon}
              alt="Happiness icon"
            />
            <div>
              <div className="po-status-name">Happiness</div>
              <div className="po-status-value">😊 {pet.happiness}%</div>
            </div>
          </div>
          <div className="po-status-card po-status-wide">
            <img
              className="po-status-img"
              src={energyIcon}
              alt="Energy icon"
            />
            <div>
              <div className="po-status-name">Energy</div>
              <div className="po-status-value">⚡ {pet.energy}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Actions =====
          Displays available point balances and triggers action requests.
      */}
      <section className="po-actions-wrap">
        <div className="po-actions-header">
          <div className="po-actions-title">Actions</div>
          <button
            className="po-refresh-btn"
            onClick={() => {
              fetchStatus();
              fetchPoints();
            }}
            disabled={loading}
            title="Reload status & points"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div
            style={{ color: "#b91c1c", marginBottom: 10, fontWeight: 600 }}
          >
            {err}
          </div>
        )}

        <div className="po-actions-grid">
          <div className="po-action-pill">
            <div className="po-action-label">Feed Points</div>
            <div className="po-action-value">{points.feeding}</div>
            <div className="po-action-sub">
              from completed “feeding” tasks
            </div>
            <div className="po-action-footer">
              <button
                className="po-action-btn"
                onClick={() => doAction("feed")}
              >
                {/* UI displays cost so users understand the spend */}
                Feed (−{POINT_COST_PER_ACTION})
              </button>
            </div>
          </div>

          <div className="po-action-pill">
            <div className="po-action-label">Play Points</div>
            <div className="po-action-value">{points.playing}</div>
            <div className="po-action-sub">
              from completed “playing” tasks
            </div>
            <div className="po-action-footer">
              <button
                className="po-action-btn"
                onClick={() => doAction("play")}
              >
                Play (−{POINT_COST_PER_ACTION})
              </button>
            </div>
          </div>

          <div className="po-action-pill">
            <div className="po-action-label">Clean Points</div>
            <div className="po-action-value">{points.cleaning}</div>
            <div className="po-action-sub">
              from completed “cleaning” tasks
            </div>
            <div className="po-action-footer">
              <button
                className="po-action-btn"
                onClick={() => doAction("clean")}
              >
                Clean (−{POINT_COST_PER_ACTION})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Evolution row =====
          Shortcut to the checklist that drives evolution/leveling conditions.
      */}
      <section className="po-evo-row">
        <div className="po-evo-left">
          <div className="po-evo-circle" />
          <div className="po-evo-text">Evolution Conditions</div>
        </div>
        <button className="po-evo-btn" onClick={goManageTasks}>
          Checklist
        </button>
      </section>

      <button className="black-btn" onClick={() => setShowChecklist(true)}>
        View Level-Up Condition!
      </button>

      <PetChecklistModal
        open={showChecklist}
        onClose={() => setShowChecklist(false)}
      />
    </div>
  );
}
