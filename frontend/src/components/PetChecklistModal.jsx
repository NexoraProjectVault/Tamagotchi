import React from "react";
import checklistImg from "./checklist.png"; 

export default function PetChecklistModal({ open, onClose }) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card image-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className="modal-title">Pet Level Up Checklist</h2>
        <p className="modal-subtitle">
          Achieve the following to level up your pet!
        </p>

        <img
          src={checklistImg}
          alt="Pet Level Up Checklist"
          className="modal-image"
        />
      </div>
    </div>
  );
}
