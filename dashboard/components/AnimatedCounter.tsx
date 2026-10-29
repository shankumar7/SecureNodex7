"use client";

import React, { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 800 }) => {
  const numericVal = typeof value === "number" ? value : parseInt(value, 10);
  const isNumber = !isNaN(numericVal);
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    if (!isNumber) return;

    let start = 0;
    const end = numericVal;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * (end - start) + start);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };

    const req = requestAnimationFrame(update);
    return () => cancelAnimationFrame(req);
  }, [numericVal, duration, isNumber]);

  if (!isNumber) {
    return <span>{value}</span>;
  }

  return <span>{displayValue.toLocaleString()}</span>;
};
