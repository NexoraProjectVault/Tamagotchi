// RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const token = localStorage.getItem("access_token");
  const loc = useLocation();
  if (!token) return <Navigate to="/welcome" replace state={{ from: loc }} />;
  return children;
}
