'use client';

import { Component, type ReactNode } from 'react';
import styles from './SectionBoundary.module.css';

interface Props {
  /** What failed, in the reader's words: "Reviews", "If you like this". */
  label: string;
  children: ReactNode;
}
interface State {
  failed: boolean;
}

/**
 * A section that fails to render keeps its slot as one line with Retry, instead of taking the
 * whole page down. Retry remounts the children; a server-side failure stays failed and says so.
 */
export class SectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[${this.props.label}]`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className={styles.line} role="alert">
        <span>{this.props.label} didn’t load.</span>
        <button type="button" className="btn btn--quiet btn--small" onClick={() => this.setState({ failed: false })}>
          Retry
        </button>
      </p>
    );
  }
}
