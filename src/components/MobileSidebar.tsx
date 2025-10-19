"use client";

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Home, Calendar, BarChart3, Users, User, LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/auth";

const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      navigate("/login");
      setIsOpen(false); // Close sidebar on logout
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false); // Close sidebar when a link is clicked
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px] sm:w-[280px] flex flex-col">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center space-x-2 text-lg font-bold">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span>DIET Kolasib</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 flex-grow">
          <Link to="/dashboard" onClick={handleLinkClick}>
            <Button variant={isActive("/dashboard") ? "default" : "ghost"} className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/reports" onClick={handleLinkClick}>
            <Button variant={isActive("/reports") ? "default" : "ghost"} className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
          <Link to="/students" onClick={handleLinkClick}>
            <Button variant={isActive("/students") ? "default" : "ghost"} className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Students
            </Button>
          </Link>
          <Link to="/faculty" onClick={handleLinkClick}>
            <Button variant={isActive("/faculty") ? "default" : "ghost"} className="w-full justify-start">
              <User className="mr-2 h-4 w-4" />
              Faculty
            </Button>
          </Link>
        </nav>
        <div className="mt-auto pt-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;