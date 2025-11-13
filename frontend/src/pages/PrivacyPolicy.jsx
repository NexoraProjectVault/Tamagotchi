import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="section">
      <h1 className="section-title">Privacy Policy</h1>
      <p className="section-subtitle">
        This Privacy Policy explains how Pixel Pet handles data in the context of this
        course / demo application.
      </p>

      <div className="card">
        <h2 className="card-title">1. Data we collect</h2>
        <p className="card-subtitle">
          Pixel Pet may store:
        </p>
        <ul className="card-subtitle">
          <li>Account or identifier used to log in (e.g. email / student ID / username)</li>
          <li>Tasks you create, edit, complete, or delete</li>
          <li>Pet status (level, points, mood) derived from your task activity</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="card-title">2. How we use this data</h2>
        <ul className="card-subtitle">
          <li>To display your tasks and progress inside the app</li>
          <li>To update your pet&apos;s state based on completed tasks</li>
          <li>To analyze feature usage in anonymized form for improving the app</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="card-title">3. Data sharing</h2>
        <p className="card-subtitle">
          We do not sell or share your data with third parties. For course deployments,
          instructors and TAs may access stored data strictly for grading, debugging, and
          educational purposes.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">4. Data retention & deletion</h2>
        <p className="card-subtitle">
          Data is retained for the duration of the course / project. You may request
          deletion of your data by contacting the maintainers through the Support page.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">5. Cookies & local storage</h2>
        <p className="card-subtitle">
          If the app uses cookies or local storage, they are only used to keep you logged
          in and remember basic preferences.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">6. Changes to this policy</h2>
        <p className="card-subtitle">
          Any updates to this policy will be reflected on this page. Continuing to use
          Pixel Pet after changes means you accept the updated policy.
        </p>
      </div>
    </div>
  );
}
