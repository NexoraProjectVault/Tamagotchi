import React from "react";

export default function Help() {
  return (
    <div className="section help-page">
      <h1 className="section-title">Help</h1>
      <p className="section-subtitle">
        New to Pixel Pet? This guide walks you through the essentials so you can
        manage tasks and keep your pet happy.
      </p>

      <div className="card">
        <h2 className="card-title">Getting started</h2>
        <p className="card-subtitle">
          1. Go to the <b>Tasks</b> page to create your first tasks. <br />
          2. Mark tasks as completed when you finish them. <br />
          3. Watch your pet&apos;s level and mood improve in the <b>Pet</b> page.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Understanding the main pages</h2>
        <ul className="card-subtitle">
          <li><b>Home / Dashboard:</b> Today&apos;s tasks and quick actions.</li>
          <li><b>Tasks:</b> Full list of tasks, due dates, categories, and priorities.</li>
          <li><b>Pet:</b> Shows your pet&apos;s current status based on your progress.</li>
          <li><b>Profile:</b> User info or simple settings.</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="card-title">Tips for staying on track</h2>
        <ul className="card-subtitle">
          <li>Keep tasks small and clear so they&apos;re easy to complete.</li>
          <li>Use categories or tags to separate school, work, and personal goals.</li>
          <li>Check in daily — your pet&apos;s mood reflects your consistency.</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="card-title">Still confused?</h2>
        <p className="card-subtitle">
          Check the <b>FAQ</b> page for common questions or visit the <b>Support</b> page
          to report issues or contact the maintainers.
        </p>
      </div>
    </div>
  );
}
