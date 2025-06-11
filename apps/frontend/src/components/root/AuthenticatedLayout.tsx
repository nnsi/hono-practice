import { DateProvider } from "@frontend/providers/DateProvider";
import {
  GearIcon,
  CardStackPlusIcon,
  BarChartIcon,
  CalendarIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { Outlet, Link } from "@tanstack/react-router";

import { Toaster } from "../ui";

export const AuthenticatedLayout: React.FC = () => {
  return (
    <>
      <div className="h-svh w-full max-w-3xl mx-auto flex flex-col">
        <main className="flex-1 p-4 overflow-y-auto">
          <DateProvider>
            <Outlet />
          </DateProvider>
        </main>
        <footer className="w-full bg-gray-50 shadow-lg sticky bottom-0 left-0 select-none">
          <nav className="flex justify-around items-center p-4">
            <Link
              to="/"
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
            <Link
              to="/goal"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <TargetIcon />
                <span className="text-xs mt-1">Goal</span>
              </button>
            </Link>
            <Link
              to="/setting"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <GearIcon />
                <span className="text-xs mt-1">Setting</span>
              </button>
            </Link>
          </nav>
        </footer>
      </div>
      <Toaster />
    </>
  );
};
