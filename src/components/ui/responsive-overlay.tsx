import { ReactNode, forwardRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ResponsiveOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Desktop: dialog width class. Default: "sm:max-w-lg" */
  desktopWidth?: string;
  /** Mobile: sheet side. Default: "bottom" */
  mobileSide?: "bottom" | "right";
  className?: string;
}

export const ResponsiveOverlay = forwardRef<HTMLDivElement, ResponsiveOverlayProps>(
  function ResponsiveOverlay(
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      footer,
      desktopWidth = "sm:max-w-lg",
      mobileSide = "bottom",
      className,
    },
    _ref
  ) {
    const isMobile = useIsMobile();

    if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side={mobileSide}
            className={cn(
              "flex flex-col p-0 rounded-t-2xl",
              mobileSide === "bottom"
                ? "h-[92dvh] max-h-[92dvh]"
                : "w-full max-w-[90vw] h-full",
              className
            )}
          >
            <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
              <SheetTitle className="text-base">{title}</SheetTitle>
              {description && (
                <SheetDescription className="text-xs">{description}</SheetDescription>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 pb-4">{children}</div>
            </ScrollArea>

            {footer && (
              <div className="border-t px-4 py-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex flex-col overflow-hidden p-0",
            "max-h-[85vh]",
            desktopWidth,
            className
          )}
        >
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 pb-4">{children}</div>
          </ScrollArea>

          {footer && (
            <div className="border-t px-6 py-4 shrink-0">{footer}</div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);
