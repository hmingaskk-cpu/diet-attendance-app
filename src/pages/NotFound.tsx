import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import MobileBottomNavigation from "@/components/MobileBottomNavigation"; // Import MobileBottomNavigation

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 pb-20 md:pb-4"> {/* Adjusted padding */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
          <Link to="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
      <MobileBottomNavigation />
    </div>
  );
};

export default NotFound;