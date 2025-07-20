import { ApiKeyManager } from "@frontend/components/apiKey";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@frontend/components/ui";
import { useUserSettings } from "@frontend/hooks/feature/setting/useUserSettings";
import { GoogleLogin } from "@react-oauth/google";

export const SettingPage: React.FC = () => {
  const {
    isGoogleLinked,
    handleLogout,
    handleGoogleLink,
    handleGoogleLinkError,
  } = useUserSettings();

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="account">
          <AccordionTrigger className="text-lg font-semibold">
            アカウント設定
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <Button onClick={handleLogout} variant="outline">
                  ログアウト
                </Button>
                {isGoogleLinked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">
                      Google認証済み
                    </span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleLink}
                    onError={handleGoogleLinkError}
                  />
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-keys">
          <AccordionTrigger className="text-lg font-semibold">
            APIキー管理
          </AccordionTrigger>
          <AccordionContent>
            <ApiKeyManager />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
