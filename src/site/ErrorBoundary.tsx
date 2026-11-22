import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Rendered in place of the failed subtree; `retry` remounts it. */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Contains a render or chunk-loading failure to one page instead of blanking
 * the whole site. Keyed by route in App, so navigating away also resets it.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry by design (privacy); surface it for whoever opens devtools.
    console.error("Shwaas page error:", error, info.componentStack);
  }

  retry = (): void => {
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}
