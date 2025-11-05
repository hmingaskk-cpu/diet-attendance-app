"use client";

import React from "react";
import Navigation from "@/components/Navigation";
import MobileBottomNavigation from "@/components/MobileBottomNavigation";
import { MadeWithDyad } from "@/components/made-with-dyad"; // Assuming this should be part of the layout

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
      <MobileBottomNavigation />
      <MadeWithDyad />
    </div>
  );
};

export default AppLayout;