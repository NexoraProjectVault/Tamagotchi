import { useEffect, useState } from "react";
import "./CursorTrail.css";

export default function CursorTrail() {
  const [colors, setColors] = useState(["#9EEAFD"]); // fallback

  useEffect(() => {
    setColors(["#9EEAFD", "#FFE38A", "#C8B5FF"]);
  }, []);

  useEffect(() => {
    if (!colors || colors.length === 0) return;

    const getRandomColor = () =>
      colors[Math.floor(Math.random() * colors.length)];

    const createParticle = (x, y) => {
      const p = document.createElement("div");
      p.className = "cursor-particle";

      const c = getRandomColor();
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = c;
      p.style.boxShadow = `0 0 10px ${c}`;

      document.body.appendChild(p);

      setTimeout(() => p.remove(), 700);
    };

    const move = (e) => createParticle(e.clientX, e.clientY);

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [colors]);

  return null;
}
