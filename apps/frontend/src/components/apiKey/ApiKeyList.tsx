import type React from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui";
import { useToast } from "@frontend/components/ui/use-toast";
import { useApiKeys, useDeleteApiKey } from "@frontend/hooks/api/apiKey";
import dayjs from "dayjs";

export const ApiKeyList: React.FC = () => {
  const { data, isLoading } = useApiKeys();
  const deleteApiKey = useDeleteApiKey();
  const { toast } = useToast();

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(`APIキー「${name}」を削除しますか？この操作は取り消せません。`)
    ) {
      return;
    }

    try {
      await deleteApiKey.mutateAsync(id);
      toast({
        title: "成功",
        description: `APIキー「${name}」を削除しました`,
      });
    } catch (_error) {
      toast({
        title: "エラー",
        description: "APIキーの削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  // APIキー削除ボタンのクリックハンドラを作成する関数
  const createDeleteHandler = (id: string, name: string) => {
    return () => handleDelete(id, name);
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  const apiKeys = data?.apiKeys || [];

  return (
    <div className="space-y-4">
      {apiKeys.length === 0 ? (
        <p className="text-muted-foreground">APIキーがありません</p>
      ) : (
        apiKeys.map((apiKey) => (
          <Card key={apiKey.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {apiKey.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">キー: </span>
                <code className="bg-muted px-2 py-1 rounded">{apiKey.key}</code>
              </div>
              <div className="text-sm text-muted-foreground">
                作成日: {dayjs(apiKey.createdAt).format("YYYY-MM-DD HH:mm")}
              </div>
              {apiKey.lastUsedAt && (
                <div className="text-sm text-muted-foreground">
                  最終使用日:{" "}
                  {dayjs(apiKey.lastUsedAt).format("YYYY-MM-DD HH:mm")}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={createDeleteHandler(apiKey.id, apiKey.name)}
                  disabled={deleteApiKey.isPending}
                >
                  削除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
