import React from "react";

export default function Support() {
  return (
    <div className="section">
      <h1 className="section-title">Support</h1>
      <p className="section-subtitle">
        Having trouble with Pixel Pet? Use the options below to reach the team
        maintaining this application.
      </p>

      <div className="card">
        <h2 className="card-title">Report a bug</h2>
        <p className="card-subtitle">
          Please include:
        </p>
        <ul className="card-subtitle">
          <li>What you were trying to do</li>
          <li>What actually happened (error message / wrong behavior)</li>
          <li>Your browser and screen size (if layout-related)</li>
        </ul>
        <p className="card-subtitle">
          For the course version, submit an issue in your project repo or contact the
          us via the specified channel.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Feature requests</h2>
        <p className="card-subtitle">
          Ideas for new pet states, rewards, or productivity features are welcome. Add
          them to the issue tracker or feedback form so the team can triage them.
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Contact</h2>
        <p className="card-subtitle">
          About our team:
          <br />
          Project manager: Vivian Tu 
          <br />
          Software Lead: Richelle Pereira 
          <br />
          Frontend Developer: Lynne Liu 
          <br />
          Backend Developer: Joshua Chau 
          <br />
          Full-Stack Developer: Jin Xiao
          <br />
          UX Designer: Kyna Wu 
          <br />
          Thank you all for your hard working thoughout the semester!
        </p>
      </div>
    </div>
  );
}
