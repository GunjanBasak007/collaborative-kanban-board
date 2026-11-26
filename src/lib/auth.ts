
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type SignUpInput = {
  username: string;
  email: string;
  password: string;
};

// SIGN UP
export const signUp = async ({
  username,
  email,
  password,
}: SignUpInput) => {
  const normalizedUsername = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
    throw new Error(
      "Username must be 3-24 characters and contain only letters, numbers, and underscores."
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
    data: {
    username: normalizedUsername,
  },
  emailRedirectTo: `${window.location.origin}/`,
},
  });

  if (error) throw error;

  return data;
};

// LOGIN
export const signIn = async (
  email: string,
  password: string
) => {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (error) throw error;

  return data;
};

// LOGOUT
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
};

// GET CURRENT SESSION
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
};

// LISTEN FOR AUTHENTICATION CHANGES
export const subscribeToAuthChanges = (
  callback: (session: Session | null) => void
) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
};
