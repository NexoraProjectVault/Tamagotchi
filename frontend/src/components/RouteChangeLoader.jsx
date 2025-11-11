// src/components/RouteChangeLoader.jsx
import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./loader.css";
import loaderImg from "./Loading.gif";

/**
 * 在每次路由变更时显示 Loading 覆盖层
 * @param {number} minDuration    动画至少显示多久(ms) 例如 600
 * @param {number} delay          为避免闪烁，延迟再显示(ms) 例如 120
 */
export default function RouteChangeLoader({ minDuration = 600, delay = 0 }) {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const startAtRef = useRef(0);
  const delayTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const prevPathRef = useRef(location.pathname + location.search + location.hash);

  useLayoutEffect(() => {
    const nextPath = location.pathname + location.search + location.hash;
    // 只有真正路由变化才触发
    if (nextPath !== prevPathRef.current) {
      prevPathRef.current = nextPath;

      // 路由开始：记录时间，先开一个“延迟再显示”的定时器，避免 <120ms 的闪白
      startAtRef.current = Date.now();
      clearTimeout(delayTimerRef.current);
      if (delay <= 0) {
        setShow(true);              // 立即显示（在首帧之前）
      } else {
        delayTimerRef.current = setTimeout(() => setShow(true), delay);
      }

      // 路由稳定后：等到至少 minDuration 再隐藏
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        const elapsed = Date.now() - startAtRef.current;
        const remain = Math.max(0, minDuration - elapsed);
        setTimeout(() => setShow(false), remain);
      }, 0);
    }

    return () => {
      clearTimeout(delayTimerRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, [location, minDuration, delay]);

  if (!show) return null;

  return (
  <div className="loader-overlay" role="status" aria-live="polite" aria-busy="true">
    <img src={loaderImg} alt="Loading..." className="loader-img" />
    <div className="loader-text">Loading…</div>
  </div>
);

}
