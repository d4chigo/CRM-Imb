"use client"

import React, { useState } from 'react';
import { ModernHeader } from './modern-header';
import { ModernSidebar } from './modern-sidebar';

interface CrmLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string;
    nombre?: string;
    email: string;
    avatar?: string;
  };
}

export function CrmLayout({ children, user }: CrmLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <ModernSidebar isCollapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={toggleMobileSidebar}
          />
          <div className="relative">
            <ModernSidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <ModernHeader 
          onMenuClick={toggleMobileSidebar}
          user={user}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Toggle Button (Desktop) */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-4 left-4 z-40 hidden rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl md:block"
        title={sidebarCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {sidebarCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          )}
        </svg>
      </button>
    </div>
  );
}