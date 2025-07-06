import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui";

import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export const ApiKeyManager: React.FC = () => {
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
