// src/components/FloatingMusicToggle.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FloatingMusicToggle.css";

import bgMusic from "../assets/music.mp3";

export default function FloatingMusicToggle() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(bgMusic);
    audio.loop = true;
    audioRef.current = audio;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);  
      })
      .catch((err) => {
        console.warn("Autoplay blocked:", err);
        setIsPlaying(false);  
      });



    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to play background music:", err);
    }
  };

  return createPortal(
    <div className="fm-wrapper">
      <button
          className={`fm-fab ${isPlaying ? "is-playing" : ""}`}
          onClick={toggleMusic}
          aria-label={isPlaying ? "Turn music off" : "Turn music on"}
          style={{
          position: "fixed",
          right: "26px",    // ← moved to right corner
          bottom: "96px",   // ← moved up above floating navigator
          zIndex: 3200,     // below navigator backdrop so it blurs together
          }}
      >
          <span className="fm-icon">{isPlaying ? "🔊" : "🔈"}</span>
      </button>
      </div>,
    document.body
    );

}
