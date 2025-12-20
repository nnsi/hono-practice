import { useAuth } from "@frontend/hooks/useAuth";
import { DateProvider } from "@frontend/providers/DateProvider";
import {
  BarChartIcon,
  CalendarIcon,
  CardStackPlusIcon,
  CheckboxIcon,
  ExitIcon,
  GearIcon,
  HamburgerMenuIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Toaster,
  useToast,
} from "../ui";

export const AuthenticatedLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      navigate({
        to: "/",
      });
    } catch (_e) {
      toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="h-svh w-full max-w-3xl mx-auto flex flex-col relative">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                type="button"
                aria-label="メニュー"
              >
                <HamburgerMenuIcon className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link
                  to="/setting"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <GearIcon className="h-4 w-4" />
                  <span>設定</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <ExitIcon className="h-4 w-4" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <main className="flex-1 p-4 overflow-y-auto">
          <DateProvider>
            <Outlet />
          </DateProvider>
        </main>
        <footer className="w-full bg-gray-50 shadow-lg sticky bottom-0 left-0 select-none">
          <nav className="flex justify-around items-center p-4">
            <Link
              to="/actiko"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <CardStackPlusIcon />
                <span className="text-xs mt-1">Actiko</span>
              </button>
            </Link>
            <Link
              to="/daily"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <CalendarIcon />
                <span className="text-xs mt-1">Daily</span>
              </button>
            </Link>
            <Link
              to="/activity/stats"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <BarChartIcon />
                <span className="text-xs mt-1">Stats</span>
              </button>
            </Link>
            {/*<Link
              to="/goal"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <TargetIcon />
                <span className="text-xs mt-1">Goal</span>
              </button>
            </Link>*/}
            <Link
              to="/new-goal"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <TargetIcon />
                <span className="text-xs mt-1">Goal</span>
              </button>
            </Link>
            <Link
              to="/tasks"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <CheckboxIcon />
                <span className="text-xs mt-1">Tasks</span>
              </button>
            </Link>
          </nav>
        </footer>
      </div>
      <Toaster />
    </>
  );
};
