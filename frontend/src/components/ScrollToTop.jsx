// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 每次路由变化后滚动到顶部
    window.scrollTo({ top: 0, behavior: "instant" }); 
  }, [pathname]);

  return null;
}
