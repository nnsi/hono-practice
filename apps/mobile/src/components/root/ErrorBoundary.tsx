import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { reportError } from "../../utils/errorReporter";

type Props = {
  children: ReactNode;
  onRecover?: () => Promise<void>;
};

type State = {
  hasError: boolean;
  retryKey: number;
  retryCount: number;
  isRecovering: boolean;
};

const MAX_RETRIES = 2;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0, retryCount: 0, isRecovering: false };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError({
      errorType: "component_error",
      message: error.message,
      stack: [error.stack, errorInfo.componentStack]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    // リトライ後に正常描画できたらカウントリセット
    if (prevState.hasError && !this.state.hasError && this.state.retryCount > 0) {
      this.setState({ retryCount: 0 });
    }
  }

  handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      retryKey: prev.retryKey + 1,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleRecover = (): void => {
    if (!this.props.onRecover) return;
    this.setState({ isRecovering: true });
    this.props.onRecover()
      .then(() => {
        this.setState({
          hasError: false,
          retryKey: this.state.retryKey + 1,
          retryCount: 0,
          isRecovering: false,
        });
      })
      .catch(() => {
        this.setState({ isRecovering: false });
      });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const exhausted = this.state.retryCount >= MAX_RETRIES;

      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            backgroundColor: "#1c1917",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#fafaf9",
              marginBottom: 8,
            }}
          >
            エラーが発生しました
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#a8a29e",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {exhausted
              ? "繰り返しエラーが発生しています。"
              : "予期しないエラーが発生しました。\nリトライしても解決しない場合は、アプリを再起動してください。"}
          </Text>
          {!exhausted && (
            <Pressable
              onPress={this.handleRetry}
              style={{
                backgroundColor: "#f59e0b",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}
              >
                リトライ
              </Text>
            </Pressable>
          )}
          {exhausted && this.props.onRecover && (
            <Pressable
              onPress={this.handleRecover}
              disabled={this.state.isRecovering}
              style={{
                backgroundColor: this.state.isRecovering ? "#57534e" : "#3b82f6",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                marginTop: 12,
              }}
            >
              {this.state.isRecovering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff", textAlign: "center" }}>
                  ローカルデータを復旧{"\n"}
                  <Text style={{ fontSize: 11, fontWeight: "400", color: "#d1d5db" }}>
                    インターネット接続が必要です
                  </Text>
                </Text>
              )}
            </Pressable>
          )}
        </View>
      );
    }

    return (
      <View key={this.state.retryKey} style={{ flex: 1 }}>
        {this.props.children}
      </View>
    );
  }
}
