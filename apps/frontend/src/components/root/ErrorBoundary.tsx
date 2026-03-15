import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import {
  type ReportErrorOptions,
  reportError,
} from "@packages/frontend-shared";

type Props = {
  children: ReactNode;
  reportErrorOptions: ReportErrorOptions;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError(
      {
        errorType: "component_error",
        message: error.message,
        stack: [error.stack, errorInfo.componentStack]
          .filter(Boolean)
          .join("\n\n"),
      },
      this.props.reportErrorOptions,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-svh flex items-center justify-center bg-stone-900 px-6">
          <div className="text-center">
            <p className="text-xl font-bold text-stone-50 mb-2">
              エラーが発生しました
            </p>
            <p className="text-sm text-stone-400 mb-6">
              予期しないエラーが発生しました。
              <br />
              リトライしても解決しない場合は、ページを再読み込みしてください。
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="bg-amber-500 text-stone-900 font-semibold px-6 py-3 rounded-lg"
            >
              リトライ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
