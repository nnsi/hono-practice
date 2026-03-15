import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { Pressable, Text, View } from "react-native";

import { reportError } from "../../utils/errorReporter";

type Props = {
  children: ReactNode;
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
    reportError({
      errorType: "component_error",
      message: error.message,
      stack: [error.stack, errorInfo.componentStack]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
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
            予期しないエラーが発生しました。{"\n"}
            リトライしても解決しない場合は、アプリを再起動してください。
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{
              backgroundColor: "#f59e0b",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1917" }}>
              リトライ
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
