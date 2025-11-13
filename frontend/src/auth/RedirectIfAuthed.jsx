// RedirectIfAuthed.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function RedirectIfAuthed({ children }) {
  const token = localStorage.getItem("access_token");
  if (token) return <Navigate to="/" replace />;
  return children;
}
