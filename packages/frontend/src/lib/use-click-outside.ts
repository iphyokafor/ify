"use client";

import { useEffect, type RefObject } from "react";

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  onOutside: () => void,
): void => {
  useEffect(() => {
    if (!isActive) return;

    const handleClick = (event: MouseEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) {
        onOutside();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, isActive, onOutside]);
};
