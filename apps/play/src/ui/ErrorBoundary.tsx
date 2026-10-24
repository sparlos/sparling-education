import { Component, type ReactNode } from "react";

/** Catches a crash inside a game so the shell can still save the play and offer a way out. */
export class ErrorBoundary extends Component<
  { fallback: ReactNode; onError(error: unknown): void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
