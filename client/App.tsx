import "./global.css";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Import pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import WasteClassification from "./pages/WasteClassification";
import RecyclingCenters from "./pages/RecyclingCenters";
import Rewards from "./pages/Rewards";
import BuyBackPage from "./pages/BuyBack";
import Analytics from "./pages/Analytics";
import FootprintPage from "./pages/Footprint";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Assessment from "./pages/Assessment";
import ARScanner from "./pages/ARScanner";
import Leaderboard from "./pages/Leaderboard";
import SmartBinsPage from "./pages/SmartBins";
import NotFound from "./pages/NotFound";
import WastePickup from "./pages/WastePickup";
import ReportIssue from "./pages/ReportIssue";
import MessagesPage from "./pages/Messages";
import SettingsPage from "./pages/Settings";
import MarketplacePage from "./pages/Marketplace";
import SellItemPage from "./pages/SellItem";
import ListingDetailPage from "./pages/ListingDetail";

// Import components
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import { useAuth as useSupabaseAuth } from "@/lib/supabase";
import { validateConfig } from "@/lib/config";

const queryClient = new QueryClient();

// Mock User Interface
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  points: number;
  level: string;
  wasteClassified: number;
  joinedDate: string;
  ecoScore: number;
  badges: string[];
  preferences: {
    darkMode: boolean;
    notifications: boolean;
    language: string;
  };
}

// Authentication Context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Mock authentication provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any legacy mock user and start unauthenticated
    try {
      localStorage.removeItem("ecosort_user");
    } catch {}
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Disable mock login; rely on Supabase auth flows elsewhere
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    return false;
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    // Disable mock signup; rely on Supabase auth flows elsewhere
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ecosort_user");
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const { user: sbUser, loading: sbLoading } = useSupabaseAuth();

  if (loading || sbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-primary"></div>
      </div>
    );
  }

  const isAuthed = !!user || !!sbUser;
  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { user: sbUser, loading: sbLoading } = useSupabaseAuth();

  if (loading || sbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-primary"></div>
      </div>
    );
  }

  const isAuthed = !!user || !!sbUser;
  return !isAuthed ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

// Unified layout wrapper (always shows Sidebar via DashboardLayout)
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DashboardLayout>
      {children}
      <Toaster />
      <Sonner />
    </DashboardLayout>
  );
};

const App = () => {
  // Validate configuration on app start
  React.useEffect(() => {
    validateConfig();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/"
                  element={
                    <PublicRoute>
                      <LandingPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <SignupPage />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assessment"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Assessment />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/classify"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WasteClassification />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scan"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WasteClassification />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ar-scanner"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ARScanner />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/centers"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <RecyclingCenters />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/buyback"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <BuyBackPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/marketplace"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MarketplacePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sell-item"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SellItemPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/listing/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ListingDetailPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/smart-bins"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SmartBinsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rewards"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Rewards />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pickup"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WastePickup />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ReportIssue />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MessagesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SettingsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Analytics />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/footprint"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FootprintPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Leaderboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <About />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
