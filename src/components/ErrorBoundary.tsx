import { Component, type ReactNode } from "react";

/** v8 robustness: one panel's crash must never kill the cockpit. Each section
 *  renders inside its own boundary; the fallback keeps the poster language
 *  (paper card, caps, hairline) and offers a reload — no spinners, no debris. */
interface Props {
  label: string;
  children: ReactNode;
}
interface State {
  err: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error) {
    // diagnostics live in receipts, not on screen — one console line only
    console.error(`[cookiepilot] ${this.props.label} panel error:`, err.message);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="card panelerr" role="alert">
          <h3>{this.props.label} panel paused</h3>
          <p className="pe-note">
            This section hit an unexpected error — the rest of the cockpit keeps running.
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload cockpit →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
