/**
 * Supabase Client Configuration and Authentication
 */

import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase as supabaseConfig } from "./config";

// Enhanced Database types based on our schema
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  points: number;
  level: string;
  eco_score: number;
  waste_classified: number;
  joined_date: string;
  location?: {
    city?: string;
    country?: string;
    coordinates?: [number, number];
  };
  preferences: {
    notifications: boolean;
    dark_mode: boolean;
    language: string;
  };
  created_at: string;
  updated_at: string;
}

export interface WasteClassification {
  id: string;
  user_id: string;
  image_url: string;
  classification: "biodegradable" | "recyclable" | "hazardous";
  confidence: number;
  points_earned: number;
  location?: {
    lat: number;
    lng: number;
  };
  details?: {
    material?: string;
    subCategory?: string;
    recommendations?: string[];
    environmentalImpact?: {
      co2Saved?: number;
      energySaved?: number;
      waterSaved?: number;
    };
  };
  verified: boolean;
  created_at: string;
}

export interface RecyclingCenter {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  accepted_types: string[];
  hours: string;
  contact: string;
  website?: string;
  rating: number;
  verified: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  badge_type: "bronze" | "silver" | "gold" | "platinum";
  category: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: "discount" | "product" | "service" | "donation";
  cost_in_points: number;
  category: string;
  provider: string;
  image_url?: string;
  available: boolean;
  stock?: number;
  valid_until?: string;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_used: number;
  status: "pending" | "completed" | "cancelled";
  redemption_code?: string;
  redeemed_at: string;
  reward?: Reward;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  points_earned: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  timeframe: "daily" | "weekly" | "monthly" | "all_time";
  category: "global" | "local" | "friends";
  points: number;
  rank: number;
  calculated_at: string;
  user_profile?: Pick<UserProfile, "full_name" | "avatar_url" | "level">;
}

// Create Supabase client
let supabaseClient: SupabaseClient | null = null;

export const createSupabaseClient = () => {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.warn(
      "Supabase configuration missing. Database features will not work.",
    );
    console.warn("URL:", supabaseConfig.url);
    console.warn("Anon Key:", supabaseConfig.anonKey ? "Present" : "Missing");
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
};

export const supabase = createSupabaseClient();

// Enhanced Authentication Hook
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      // Mock mode: read persisted mock user if any
      try {
        const raw = localStorage.getItem("ecosort_mock_user");
        if (raw) {
          const mock = JSON.parse(raw);
          setUser(mock as any);
        }
      } catch {}
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle sign up completion
      if (event === "SIGNED_IN" && session?.user) {
        await ensureUserProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureUserProfile = async (user: User) => {
    if (!supabase) return;

    try {
      const { data: profile, error: selectError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (selectError) {
        console.warn(
          "User profiles table not accessible or protected:",
          selectError.message || selectError,
        );
        return; // Skip silently if table missing or RLS blocks access
      }

      if (!profile) {
        // Upsert profile if it doesn't exist
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert(
            {
              id: user.id,
              email: user.email,
              full_name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "User",
              avatar_url: user.user_metadata?.avatar_url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

        if (profileError) {
          console.error(
            "Error creating user profile:",
            profileError.message || profileError,
          );
        }
      }
    } catch (err: any) {
      console.error("Error ensuring user profile:", err?.message || err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);

    if (!supabase) {
      const mock: any = {
        id: "mock-user-1",
        email,
        app_metadata: { provider: "email" },
        user_metadata: { full_name: email.split("@")[0] },
      };
      try {
        localStorage.setItem("ecosort_mock_user", JSON.stringify(mock));
      } catch {}
      setUser(mock as User);
      setSession(null);
      return { user: mock, session: null } as any;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return data;
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    metadata?: { full_name?: string },
  ) => {
    setError(null);

    if (!supabase) {
      const mock: any = {
        id: "mock-user-1",
        email,
        app_metadata: { provider: "email" },
        user_metadata: {
          full_name: metadata?.full_name || email.split("@")[0],
        },
      };
      try {
        localStorage.setItem("ecosort_mock_user", JSON.stringify(mock));
      } catch {}
      setUser(mock as User);
      setSession(null);
      return { user: mock, session: null } as any;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return data;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error("Supabase not configured");
    setError(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return data;
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    setError(null);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return data;
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    setError(null);

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    return data;
  };

  const signOut = async () => {
    setError(null);

    if (!supabase) {
      // Mock sign out: clear local state
      setUser(null);
      setSession(null);
      try {
        localStorage.removeItem("ecosort_mock_user");
      } catch {}
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    signOut,
  };
};

// User Profile Hook
export const useUserProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!supabase || !userId)
      throw new Error("Supabase not configured or user not found");

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  return { profile, loading, error, updateProfile };
};

// Waste Classifications Hook
export const useWasteClassifications = (userId?: string) => {
  const [classifications, setClassifications] = useState<WasteClassification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    const fetchClassifications = async () => {
      try {
        const { data, error } = await supabase
          .from("waste_classifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setClassifications(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error fetching classifications",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClassifications();
  }, [userId]);

  const addClassification = async (
    classification: Omit<WasteClassification, "id" | "created_at">,
  ) => {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("waste_classifications")
      .insert(classification)
      .select()
      .single();

    if (error) throw error;
    setClassifications((prev) => [data, ...prev]);
    return data;
  };

  return { classifications, loading, error, addClassification };
};

// Recycling Centers Hook
export const useRecyclingCenters = () => {
  const [centers, setCenters] = useState<RecyclingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchCenters = async () => {
      try {
        const { data, error } = await supabase
          .from("recycling_centers")
          .select("*")
          .order("name");

        if (error) throw error;
        setCenters(data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error fetching recycling centers",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  return { centers, loading, error };
};

// Rewards Hook
export const useRewards = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchRewards = async () => {
      try {
        const { data, error } = await supabase
          .from("rewards")
          .select("*")
          .eq("available", true)
          .order("cost_in_points");

        if (error) throw error;
        setRewards(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching rewards");
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const redeemReward = async (rewardId: string, userId: string) => {
    if (!supabase) throw new Error("Supabase not configured");

    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error("Reward not found");

    // Check user points
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("points")
      .eq("id", userId)
      .single();

    if (!profile || profile.points < reward.cost_in_points) {
      throw new Error("Insufficient points");
    }

    // Create redemption
    const { data, error } = await supabase
      .from("reward_redemptions")
      .insert({
        user_id: userId,
        reward_id: rewardId,
        points_used: reward.cost_in_points,
        redemption_code: `ECOSORT-${Date.now()}`,
      })
      .select()
      .single();

    if (error) throw error;

    // Update user points
    await supabase
      .from("user_profiles")
      .update({
        points: profile.points - reward.cost_in_points,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return data;
  };

  return { rewards, redemptions, loading, error, redeemReward };
};

// User Activities Hook
export const useUserActivities = (userId?: string) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from("user_activities")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setActivities(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error fetching activities",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [userId]);

  const addActivity = async (
    activity: Omit<UserActivity, "id" | "created_at">,
  ) => {
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
      .from("user_activities")
      .insert(activity)
      .select()
      .single();

    if (error) throw error;

    // Add points to user if activity earned points
    if (activity.points_earned > 0) {
      await supabase.rpc("update_user_points", {
        user_uuid: activity.user_id,
        points_to_add: activity.points_earned,
      });
    }

    setActivities((prev) => [data, ...prev]);
    return data;
  };

  return { activities, loading, error, addActivity };
};

// Leaderboards Hook
export const useLeaderboards = (
  timeframe: string = "weekly",
  category: string = "global",
) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("leaderboard_entries")
          .select(
            `
            *,
            user_profile:user_profiles(full_name, avatar_url, level)
          `,
          )
          .eq("timeframe", timeframe)
          .eq("category", category)
          .order("rank")
          .limit(100);

        if (error) throw error;
        setLeaderboard(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error fetching leaderboard",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe, category]);

  return { leaderboard, loading, error };
};

// Achievements Hook
export const useAchievements = (userId?: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all achievements
        const { data: achievementsData, error: achievementsError } =
          await supabase
            .from("achievements")
            .select("*")
            .order("points_required");

        if (achievementsError) throw achievementsError;
        setAchievements(achievementsData || []);

        // Fetch user achievements if userId provided
        if (userId) {
          const { data: userAchievementsData, error: userAchievementsError } =
            await supabase
              .from("user_achievements")
              .select(
                `
              *,
              achievement:achievements(*)
            `,
              )
              .eq("user_id", userId)
              .order("earned_at", { ascending: false });

          if (userAchievementsError) throw userAchievementsError;
          setUserAchievements(userAchievementsData || []);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error fetching achievements",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const checkAndAwardAchievements = async (userId: string) => {
    if (!supabase) return;

    try {
      // Get user stats
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("points, waste_classified")
        .eq("id", userId)
        .single();

      if (!profile) return;

      // Check for achievements to award
      const potentialAchievements = achievements.filter((achievement) => {
        const alreadyEarned = userAchievements.some(
          (ua) => ua.achievement_id === achievement.id,
        );
        if (alreadyEarned) return false;

        // Check achievement requirements
        switch (achievement.category) {
          case "points":
            return profile.points >= achievement.points_required;
          case "classification":
            return profile.waste_classified >= achievement.points_required;
          default:
            return false;
        }
      });

      // Award new achievements
      for (const achievement of potentialAchievements) {
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
        });

        // Add activity record
        await supabase.from("user_activities").insert({
          user_id: userId,
          activity_type: "achievement_earned",
          description: `Earned achievement: ${achievement.name}`,
          points_earned: 0,
          metadata: { achievement_id: achievement.id },
        });
      }

      if (potentialAchievements.length > 0) {
        // Refresh user achievements
        const { data: updatedUserAchievements } = await supabase
          .from("user_achievements")
          .select(
            `
            *,
            achievement:achievements(*)
          `,
          )
          .eq("user_id", userId)
          .order("earned_at", { ascending: false });

        setUserAchievements(updatedUserAchievements || []);
      }

      return potentialAchievements;
    } catch (err) {
      console.error("Error checking achievements:", err);
      return [];
    }
  };

  return {
    achievements,
    userAchievements,
    loading,
    error,
    checkAndAwardAchievements,
  };
};

// Mock data fallback when Supabase is not configured
export const mockData = {
  userProfile: {
    id: "mock-user-1",
    email: "user@example.com",
    full_name: "Mock User",
    points: 1247,
    level: "Eco Champion",
    eco_score: 89,
    waste_classified: 156,
    joined_date: "2024-01-01T00:00:00Z",
    preferences: {
      notifications: true,
      dark_mode: false,
      language: "en",
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  } as UserProfile,

  classifications: [
    {
      id: "mock-1",
      user_id: "mock-user-1",
      image_url: "/placeholder.svg",
      classification: "recyclable" as const,
      confidence: 94,
      points_earned: 15,
      verified: true,
      created_at: "2024-01-15T10:00:00Z",
    },
  ] as WasteClassification[],

  recyclingCenters: [
    {
      id: "mock-center-1",
      name: "Green Recycling Hub",
      address: "123 Eco Street, Green City",
      location: { lat: 40.7128, lng: -74.006 },
      accepted_types: ["plastic", "glass", "metal"],
      hours: "8AM - 6PM",
      contact: "+1 234 567 8900",
      rating: 4.8,
      verified: true,
      created_at: "2024-01-01T00:00:00Z",
    },
  ] as RecyclingCenter[],
};
