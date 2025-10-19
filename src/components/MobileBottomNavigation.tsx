"use client";

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, Users, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileBottomNavigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (!isMobile) {
    return null; // Only render on mobile
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        <Link to="/dashboard" className="flex-1">
          <Button
            variant={isActive("/dashboard") ? "default" : "ghost"}
            className="w-full flex flex-col h-auto py-1 px-0 text-xs"
          >
            <Home className="h-5 w-5 mb-1" />
            Dashboard
          </Button>
        </Link>
        <Link to="/reports" className="flex-1">
          <Button
            variant={isActive("/reports") ? "default" : "ghost"}
            className="w-full flex flex-col h-auto py-1 px-0 text-xs"
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            Reports
          </Button>
        </Link>
        <Link to="/students" className="flex-1">
          <Button
            variant={isActive("/students") ? "default" : "ghost"}
            className="w-full flex flex-col h-auto py-1 px-0 text-xs"
          >
            <Users className="h-5 w-5 mb-1" />
            Students
          </Button>
        </Link>
        <Link to="/faculty" className="flex-1">
          <Button
            variant={isActive("/faculty") ? "default" : "ghost"}
            className="w-full flex flex-col h-auto py-1 px-0 text-xs"
          >
            <User className="h-5 w-5 mb-1" />
            Faculty
          </Button>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;