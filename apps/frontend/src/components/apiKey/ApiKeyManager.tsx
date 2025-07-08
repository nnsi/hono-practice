import type React from "react";

import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui";
import { useSubscription } from "@frontend/hooks/useSubscription";
import { Loader2 } from "lucide-react";

import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export const ApiKeyManager: React.FC = () => {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription?.canUseApiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>APIキー管理</CardTitle>
          <CardDescription>プレミアムプラン限定機能</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              APIキー機能はプレミアムプラン以上のユーザーのみご利用いただけます。
              プランをアップグレードすることで、外部アプリケーションからのアクセスが可能になります。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>APIキー管理</CardTitle>
        <CardDescription>
          外部アプリケーションからアクセスするためのAPIキーを管理します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateApiKeyDialog />
        <ApiKeyList />
      </CardContent>
    </Card>
  );
};
