"use client";

import { useEffect, useRef } from "react";

export default function SimpleSmoothTitleTicker() {
  useEffect(() => {
    const base = "SMTPMaster | ";
    const message = "Bulk Email • Transactional Email • Inbox Placement • Deliverability";
    const loop = message + " • " + message; // Duplicate for seamless loop
    
    let frameId: number;
    let startTime: number = 0;
    const duration = 30000; // 30 seconds per full cycle
    const charsToShow = 50; // How many characters to display at once
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      
      // Calculate position in the loop (0 to loop.length)
      const position = Math.floor(progress * loop.length);
      
      // Get the text segment to display
      let segment = loop.slice(position, position + charsToShow);
      
      // If we need more characters to fill the segment, wrap around
      if (segment.length < charsToShow) {
        segment += loop.slice(0, charsToShow - segment.length);
      }
      
      document.title = base + segment;
      frameId = requestAnimationFrame(animate);
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
      } else {
        startTime = 0;
        frameId = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    frameId = requestAnimationFrame(animate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.title = base + message; // Reset to clean title
    };
  }, []);
  
  return null;
}