import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ViewTransitionProps {
  children: ReactNode;
  viewKey: string;
  className?: string;
}

export function ViewTransition({ children, viewKey, className }: ViewTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentKey, setCurrentKey] = useState(viewKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  useEffect(() => {
    if (viewKey !== currentKey) {
      // Fade out
      setIsVisible(false);
      
      // Wait for fade out, then update content and fade in
      const timeout = setTimeout(() => {
        setCurrentKey(viewKey);
        setDisplayedChildren(children);
        // Small delay before fade in for smoother transition
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 150);

      return () => clearTimeout(timeout);
    } else {
      // Initial mount or same key - just show
      setDisplayedChildren(children);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [viewKey, children, currentKey]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-2 scale-[0.99]",
        className
      )}
    >
      {displayedChildren}
    </div>
  );
}
