import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetrySection = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  handleReloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full min-h-[200px] p-4">
          <div className="max-w-sm w-full bg-background border border-border rounded-xl p-6 text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive/60 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {this.props.fallbackMessage || "Algo deu errado nesta área"}
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-muted-foreground/60 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={this.handleRetrySection}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recarregar seção
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={this.handleReloadPage}
              >
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
