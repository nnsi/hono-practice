import type React from "react";
import { useState } from "react";

import {
  type CreateApiKeyRequest,
  CreateApiKeyRequestSchema,
} from "@dtos/request";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@frontend/components/ui";
import { useToast } from "@frontend/components/ui/use-toast";
import { useCreateApiKey } from "@frontend/hooks/api/apiKey";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const CreateApiKeyDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const createApiKey = useCreateApiKey();
  const { toast } = useToast();

  const form = useForm<CreateApiKeyRequest>({
    resolver: zodResolver(CreateApiKeyRequestSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: CreateApiKeyRequest) => {
    try {
      const result = await createApiKey.mutateAsync(data);
      setCreatedKey(result.apiKey.key);
      form.reset();
      toast({
        title: "成功",
        description: "APIキーを作成しました",
      });
    } catch (_error) {
      toast({
        title: "エラー",
        description: "APIキーの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      toast({
        title: "コピーしました",
        description: "APIキーをクリップボードにコピーしました",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedKey(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>新しいAPIキーを作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "APIキーが作成されました" : "新しいAPIキーの作成"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "このAPIキーは一度しか表示されません。必ずコピーして安全に保管してください。"
              : "APIキーに識別しやすい名前を付けてください。"}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <code className="text-sm break-all">{createdKey}</code>
            </div>
            <Button onClick={handleCopyKey} className="w-full">
              APIキーをコピー
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名前</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 開発用APIキー" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createApiKey.isPending}>
                  作成
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {createdKey && (
          <DialogFooter>
            <Button onClick={handleClose}>閉じる</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
