/**
 * Unified Authentication Hook
 * Combines mock authentication and Supabase authentication
 * Provides a single interface for the app to use
 */

import React, { useState, useEffect, useContext, createContext } from "react";
import { useAuth as useSupabaseAuth, UserProfile } from "./supabase";

// Extended user interface that combines both systems
export interface UnifiedUser {
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
  source: "mock" | "supabase";
}

interface UnifiedAuthContextType {
  user: UnifiedUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UnifiedUser>) => Promise<void>;
  isSupabaseConnected: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(
  undefined,
);

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider");
  }
  return context;
};

// Helper function to convert Supabase user to UnifiedUser
const convertSupabaseUser = (
  sbUser: any,
  profile?: UserProfile | null,
): UnifiedUser | null => {
  if (!sbUser) return null;

  return {
    id: sbUser.id,
    name:
      profile?.full_name ||
      sbUser.user_metadata?.full_name ||
      sbUser.email?.split("@")[0] ||
      "User",
    email: sbUser.email || "",
    avatar: profile?.avatar_url || sbUser.user_metadata?.avatar_url,
    points: profile?.points || 0,
    level: profile?.level || "Beginner",
    wasteClassified: profile?.waste_classified || 0,
    joinedDate: profile?.joined_date || new Date().toISOString().split("T")[0],
    ecoScore: profile?.eco_score || 0,
    badges: [], // Would need to fetch from achievements table
    preferences: {
      darkMode: profile?.preferences?.dark_mode || false,
      notifications: profile?.preferences?.notifications || true,
      language: profile?.preferences?.language || "en",
    },
    source: "supabase",
  };
};

// Helper function to create mock user
const createMockUser = (email: string, name?: string): UnifiedUser => {
  const isDemo = email === "demo@ecosort.app";

  return {
    id: isDemo ? "user-123" : `user-${Date.now()}`,
    name: isDemo ? "Alex Chen" : name || email.split("@")[0],
    email: email,
    avatar: isDemo
      ? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      : undefined,
    points: isDemo ? 2156 : 0,
    level: isDemo ? "Eco Champion" : "Beginner",
    wasteClassified: isDemo ? 187 : 0,
    joinedDate: isDemo ? "2024-01-15" : new Date().toISOString().split("T")[0],
    ecoScore: isDemo ? 89 : 0,
    badges: isDemo
      ? ["first-sort", "eco-warrior", "plastic-saver", "green-champion"]
      : [],
    preferences: {
      darkMode: false,
      notifications: true,
      language: "en",
    },
    source: "mock",
  };
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Supabase auth state
  const {
    user: sbUser,
    loading: sbLoading,
    error: sbError,
    signInWithEmail: sbSignInWithEmail,
    signUpWithEmail: sbSignUpWithEmail,
    signOut: sbSignOut,
  } = useSupabaseAuth();

  // Check if Supabase is properly configured
  const isSupabaseConnected = !sbLoading && (!!sbUser || sbError === null);

  useEffect(() => {
    const initializeAuth = async () => {
      if (sbLoading) return; // Wait for Supabase to initialize

      if (sbUser) {
        // User is authenticated via Supabase
        try {
          // In a real implementation, we would fetch the user profile here
          // For now, we'll use the Supabase user data directly
          const unifiedUser = convertSupabaseUser(sbUser);
          if (unifiedUser) {
            setUser(unifiedUser);
          }
        } catch (err) {
          console.error("Error loading Supabase user profile:", err);
          // Fall back to basic user info
          setUser(convertSupabaseUser(sbUser));
        }
      } else {
        // Check for stored mock user session
        const storedUser = localStorage.getItem("ecosort_user");
        if (storedUser) {
          try {
            const mockUser = JSON.parse(storedUser);
            // Convert old format to new unified format if needed
            if (mockUser && !mockUser.source) {
              setUser({ ...mockUser, source: "mock" });
            } else {
              setUser(mockUser);
            }
          } catch (err) {
            console.error("Error parsing stored user:", err);
            localStorage.removeItem("ecosort_user");
          }
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, [sbUser, sbLoading]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Try Supabase authentication first
      if (isSupabaseConnected) {
        try {
          await sbSignInWithEmail(email, password);
          // User will be set via the useEffect when sbUser updates
          return true;
        } catch (sbErr: any) {
          console.warn(
            "Supabase login failed, trying mock auth:",
            sbErr.message,
          );
          // Fall through to mock authentication
        }
      }

      // Mock authentication fallback
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      if (email === "demo@ecosort.app" && password === "password") {
        const mockUser = createMockUser(email);
        setUser(mockUser);
        localStorage.setItem("ecosort_user", JSON.stringify(mockUser));
        return true;
      }

      throw new Error("Invalid email or password");
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Try Supabase signup first
      if (isSupabaseConnected) {
        try {
          await sbSignUpWithEmail(email, password, { full_name: name });
          // User will be set via the useEffect when sbUser updates
          return true;
        } catch (sbErr: any) {
          console.warn(
            "Supabase signup failed, trying mock auth:",
            sbErr.message,
          );
          // Fall through to mock authentication
        }
      }

      // Mock authentication fallback
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      const mockUser = createMockUser(email, name);
      setUser(mockUser);
      localStorage.setItem("ecosort_user", JSON.stringify(mockUser));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);

    try {
      // Logout from Supabase if connected
      if (sbUser) {
        await sbSignOut();
      }

      // Clear local storage
      localStorage.removeItem("ecosort_user");
      setUser(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError(err.message);
    }
  };

  const updateUser = async (updates: Partial<UnifiedUser>): Promise<void> => {
    if (!user) return;

    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);

      // Update storage based on user source
      if (user.source === "mock") {
        localStorage.setItem("ecosort_user", JSON.stringify(updatedUser));
      } else if (user.source === "supabase") {
        // In a real implementation, we would update the Supabase user profile here
        console.log("Supabase user update not implemented yet");
      }
    } catch (err: any) {
      console.error("Update user error:", err);
      setError(err.message);
    }
  };

  const value: UnifiedAuthContextType = {
    user,
    loading: loading || sbLoading,
    error: error || sbError,
    login,
    signup,
    logout,
    updateUser,
    isSupabaseConnected,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};
