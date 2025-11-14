// src/pages/SelectPet.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SelectPet.css";

const baseUrl = import.meta.env.VITE_API_GATEWAY_URL;

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

export default function SelectPet() {
  const navigate = useNavigate();
  const [selectedBreed, setSelectedBreed] = useState(null);
  const [petName, setPetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const breeds = [
    { id: "Dragon", label: "Dragon", emoji: "🐉" },
    { id: "Cat",    label: "Cat",    emoji: "🐱" },
    { id: "Dog",    label: "Dog",    emoji: "🐶" },
  ];

    useEffect(() => {
    const checkExistingPet = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(
          `${baseUrl}/v1/pet-service/pets/me`,
          { headers: getAuthHeaders() }
        );

        if (res.ok) {
          navigate("/");
        }
      } catch (e) {
        console.warn("failed to check existing pet", e);
      }
    };

    checkExistingPet();
  }, [navigate]);




  async function handleConfirm(e) {
  e.preventDefault();
  if (!selectedBreed) {
    setErr("Please choose a pet first.");
    return;
  }

  setErr("");
  setLoading(true);

  try {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    if (!userId) {
      setErr("Missing user id, please sign in again.");
      navigate("/login");
      return;
    }

    const res = await fetch(`${baseUrl}/v1/pet-service/pets`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: petName || "Pixel",
        breed: selectedBreed,
        user_id: Number(userId),       // ⭐ 关键：把 user_id 也放到 body 里
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || `Failed to create pet (status ${res.status})`);
    }

    // 可选：缓存一点信息
    if (data.name) localStorage.setItem("pet_name", data.name);
    if (data.breed) localStorage.setItem("pet_breed", data.breed);

    navigate("/");                     // 创建成功后再去 Home
  } catch (e) {
    setErr(e.message || "Error creating pet");
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="pet-select-page">
      <div className="pet-select-card">
        <h1 className="pet-select-title">Choose Your First Pet</h1>
        <p className="pet-select-sub">
          Pick a companion to start your journey with Pixel Pet!
        </p>

        <form className="pet-select-form" onSubmit={handleConfirm}>
          <div className="pet-grid">
            {breeds.map((b) => (
              <button
                key={b.id}
                type="button"
                className={
                  "pet-option" +
                  (selectedBreed === b.id ? " pet-option-active" : "")
                }
                onClick={() => setSelectedBreed(b.id)}
              >
                <div className="pet-option-emoji" aria-hidden>
                  {b.emoji}
                </div>
                <div className="pet-option-label">{b.label}</div>
              </button>
            ))}
          </div>

          <div className="pet-name-field">
            <label className="pet-name-label">Pet Name</label>
            <input
              className="pet-name-input"
              type="text"
              placeholder="Pixel, Mochi, Luna..."
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
            />
          </div>

          {err && <div className="pet-select-error">{err}</div>}

          <button
            type="submit"
            className="pet-select-btn"
            disabled={loading}
          >
            {loading ? "Creating your pet…" : "Confirm and Start"}
          </button>
        </form>
      </div>
    </div>
  );
}
