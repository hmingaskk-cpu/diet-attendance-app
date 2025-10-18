import { supabase } from "@/lib/supabaseClient";

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error logging out:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
};