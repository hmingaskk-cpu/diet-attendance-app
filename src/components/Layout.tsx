"use client";

import React from "react";
import Navigation from "@/components/Navigation";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-grow p-4 md:p-6 pb-20 md:pb-6"> {/* Added pb-20 for mobile bottom nav */}
        {children}
      </main>
      <MobileBottomNavigation />
    </div>
  );
};

export default Layout;