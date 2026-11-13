import { Component, type ErrorInfo, type ReactNode } from "react";

/* A render error used to unmount the app and leave a black screen. Now the page
   explains itself and offers a way back. */

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[tourn] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-screen">
        <div className="crash-card">
          <b>Something broke on this page</b>
          <p>{this.state.error.message || "An unexpected error stopped the page from drawing."}</p>
          <div className="crash-actions">
            <button
              type="button"
              className="crash-btn crash-btn--primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.hash = "#/dashboard/billing";
              }}
            >
              Back to billing
            </button>
            <button type="button" className="crash-btn" onClick={() => window.location.reload()}>
              Reload the site
            </button>
          </div>
        </div>
      </div>
    );
  }
}
