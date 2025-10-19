"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Calendar, BarChart3, Users, User, LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet components

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      navigate("/login");
    }
  };

  const navLinks = (
    <>
      <Link to="/dashboard">
        <Button 
          variant={isActive("/dashboard") ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>
      </Link>
      <Link to="/reports">
        <Button 
          variant={isActive("/reports") ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <BarChart3 className="h-4 w-4" />
          <span>Reports</span>
        </Button>
      </Link>
      <Link to="/students">
        <Button 
          variant={isActive("/students") ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <Users className="h-4 w-4" />
          <span>Students</span>
        </Button>
      </Link>
      <Link to="/faculty">
        <Button 
          variant={isActive("/faculty") ? "default" : "ghost"} 
          size="sm"
          className="flex items-center space-x-1 w-full justify-start"
        >
          <User className="h-4 w-4" />
          <span>Faculty</span>
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">DIET Kolasib</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {navLinks}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Mobile Navigation Toggle */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] p-4">
                <div className="flex flex-col space-y-2 pt-6">
                  {navLinks}
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center space-x-1 w-full justify-start">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Logout Button */}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4" />
              <span className="ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;