import { ReactNode, useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ViewTransitionProps {
  children: ReactNode;
  viewKey: string;
  className?: string;
}

type SlideDirection = "left" | "right" | "none";

// Order of views for determining slide direction
const VIEW_ORDER = [
  "kanban",
  "table",
  "atividades",
  "gestantes",
  "conferencia",
  "pagamentos",
  "indicacoes",
];

export function ViewTransition({ children, viewKey, className }: ViewTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentKey, setCurrentKey] = useState(viewKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("none");
  const previousKeyRef = useRef(viewKey);

  useEffect(() => {
    if (viewKey !== currentKey) {
      // Determine slide direction based on view order
      const prevIndex = VIEW_ORDER.indexOf(previousKeyRef.current);
      const newIndex = VIEW_ORDER.indexOf(viewKey);
      const direction: SlideDirection = 
        newIndex > prevIndex ? "left" : newIndex < prevIndex ? "right" : "none";
      
      setSlideDirection(direction);
      
      // Slide out
      setIsVisible(false);
      
      // Wait for slide out, then update content and slide in
      const timeout = setTimeout(() => {
        setCurrentKey(viewKey);
        setDisplayedChildren(children);
        previousKeyRef.current = viewKey;
        
        // Small delay before slide in for smoother transition
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 200);

      return () => clearTimeout(timeout);
    } else {
      // Initial mount or same key - just show
      setDisplayedChildren(children);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [viewKey, children, currentKey]);

  const getTransformClasses = () => {
    if (slideDirection === "none") {
      return isVisible 
        ? "opacity-100 translate-x-0" 
        : "opacity-0 translate-x-0";
    }
    
    if (isVisible) {
      return "opacity-100 translate-x-0";
    }
    
    // Sliding out - move in direction of navigation
    if (slideDirection === "left") {
      return "opacity-0 -translate-x-8";
    }
    return "opacity-0 translate-x-8";
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out will-change-transform",
        getTransformClasses(),
        className
      )}
    >
      {displayedChildren}
    </div>
  );
}
