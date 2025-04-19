import {
  HomeIcon,
  FileTextIcon,
  ArchiveIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { Outlet, Link } from "@tanstack/react-router";

import { Toaster } from "../ui";

export const AuthenticatedLayout: React.FC = () => {
  return (
    <>
      <div className="h-svh w-full max-w-3xl mx-auto flex flex-col">
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
        <footer className="w-full bg-gray-50 shadow-lg sticky bottom-0 left-0 select-none">
          <nav className="flex justify-around items-center p-4">
            <Link
              to="/"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <HomeIcon />
                <span className="text-xs mt-1">Home</span>
              </button>
            </Link>
            <Link
              to="/task"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <FileTextIcon />
                <span className="text-xs mt-1">Task</span>
              </button>
            </Link>
            <Link
              to="/activity"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <ArchiveIcon />
                <span className="text-xs mt-1">Activity</span>
              </button>
            </Link>
            <Link
              to="/goal"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <RocketIcon />
                <span className="text-xs mt-1">Goal</span>
              </button>
            </Link>
          </nav>
        </footer>
      </div>
      <Toaster />
    </>
  );
};
