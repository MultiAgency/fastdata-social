import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="max-w-2xl mx-auto mt-20 px-4">
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <p className="mb-3">The application encountered an unexpected error.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
            {import.meta.env.DEV && (
              <div className="mt-3">
                <button
                  className="text-sm underline"
                  onClick={() =>
                    this.setState((s) => ({ showDetails: !s.showDetails }))
                  }
                >
                  {this.state.showDetails ? "Hide" : "Show"} error details
                </button>
                {this.state.showDetails && this.state.error && (
                  <pre className="mt-2 p-2 bg-muted text-destructive text-xs rounded max-h-[300px] overflow-auto">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
