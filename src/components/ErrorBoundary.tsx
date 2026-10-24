import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[20px] bg-red-950/20 border border-red-500/20 p-4 my-3 text-left">
          <p className="text-xs font-semibold text-red-400">
            {this.props.fallbackTitle || "Something went wrong loading this section."}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white transition active:scale-95 cursor-pointer"
          >
            Retry Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
