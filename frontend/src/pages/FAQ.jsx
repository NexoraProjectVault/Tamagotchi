import React from "react";

export default function FAQ() {
  return (
    <div className="section">
      <h1 className="section-title">FAQ</h1>

      <div className="card">
        <h2 className="card-title">How does Pixel Pet use my tasks?</h2>
        <p className="card-subtitle">
          Your tasks are used to calculate daily and weekly progress. Completing tasks
          grants points that increase your pet&apos;s level or happiness.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">What if I delete a task?</h2>
        <p className="card-subtitle">
          Deleted tasks are removed from your active list. They may be soft-deleted but no longer affect your pet&apos;s stats.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Does this store real personal data?</h2>
        <p className="card-subtitle">
          This app is built for learning/demo purposes. Only the minimal data needed for
          the features (tasks, simple profile, pet state) is stored on the configured
          backend. See the Privacy Policy page for details.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Why doesn&apos;t my pet level up?</h2>
        <p className="card-subtitle">
          Check that your tasks are marked as completed and that any points / thresholds
          are configured correctly. If the issue persists, report it through the Support
          page.
        </p>
      </div>
    </div>
  );
}
