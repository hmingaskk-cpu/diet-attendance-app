"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Calendar, BarChart3, Users, User, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";

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

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg">DIET Kolasib</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              <Link to="/dashboard">
                <Button 
                  variant={isActive("/dashboard") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Link to="/reports">
                <Button 
                  variant={isActive("/reports") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Button>
              </Link>
              <Link to="/students">
                <Button 
                  variant={isActive("/students") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Users className="h-4 w-4" />
                  <span>Students</span>
                </Button>
              </Link>
              <Link to="/faculty">
                <Button 
                  variant={isActive("/faculty") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <User className="h-4 w-4" />
                  <span>Faculty</span>
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;