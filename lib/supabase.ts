import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DesktopState } from "@/utils/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const USER_FILES_BUCKET = "user-files";
export const MAX_USER_UPLOAD_BYTES = 3 * 1024 * 1024;

export interface SupabaseHealth {
  configured: boolean;
  connected: boolean;
  signedIn: boolean;
  projectHost: string | null;
  message: string;
}

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const getSupabaseProjectHost = (): string | null => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

export const checkSupabaseConnection = async (): Promise<SupabaseHealth> => {
  if (!supabase) {
    return {
      configured: false,
      connected: false,
      signedIn: false,
      projectHost: getSupabaseProjectHost(),
      message: "Supabase environment variables are missing.",
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return {
      configured: true,
      connected: false,
      signedIn: false,
      projectHost: getSupabaseProjectHost(),
      message: error.message,
    };
  }

  return {
    configured: true,
    connected: true,
    signedIn: Boolean(data.session?.user),
    projectHost: getSupabaseProjectHost(),
    message: data.session?.user ? "Connected and signed in." : "Connected. No active user session.",
  };
};

export const pushStateToCloud = async (
  userId: string,
  state: DesktopState,
): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("webos_sessions").upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Cloud sync failed: ${error.message}`);
  }
};

export const pullStateFromCloud = async (
  userId: string,
): Promise<DesktopState | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("webos_sessions")
    .select("state")
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return (data?.state as DesktopState | undefined) ?? null;
};

export const getSignedInUserId = async (): Promise<string | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }

  return data.user?.id ?? null;
};

export const signInWithMagicLink = async (email: string): Promise<void> => {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    throw new Error(error.message);
  }
};

const getCurrentUser = async () => {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("Please sign in before uploading files");
  }

  return data.user;
};

const getStorageErrorMessage = (message: string): string => {
  if (/bucket/i.test(message) || /not found/i.test(message) || /policy/i.test(message)) {
    return `Supabase storage is not ready. Create the '${USER_FILES_BUCKET}' bucket and storage policies first.`;
  }

  return message;
};

export const getUserUploadUsage = async (): Promise<{ userId: string; usedBytes: number }> => {
  const user = await getCurrentUser();

  const { data, error } = await supabase!.storage.from(USER_FILES_BUCKET).list(user.id, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(getStorageErrorMessage(error.message));
  }

  const usedBytes = (data ?? []).reduce((total, item) => {
    const metadata = item.metadata as { size?: number } | null;
    return total + (metadata?.size ?? 0);
  }, 0);

  return { userId: user.id, usedBytes };
};

export const createSignedFileUrl = async (storagePath: string): Promise<string> => {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(getStorageErrorMessage(error?.message ?? "Could not create file URL"));
  }

  return data.signedUrl;
};

export const uploadUserFile = async (
  file: File,
): Promise<{
  userId: string;
  storagePath: string;
  signedUrl: string;
  sizeBytes: number;
  mimeType: string;
}> => {
  const user = await getCurrentUser();
  const { usedBytes } = await getUserUploadUsage();

  if (file.size + usedBytes > MAX_USER_UPLOAD_BYTES) {
    throw new Error(`Upload limit reached. Each user can store up to ${Math.round(MAX_USER_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error } = await supabase!.storage.from(USER_FILES_BUCKET).upload(storagePath, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(getStorageErrorMessage(error.message));
  }

  return {
    userId: user.id,
    storagePath,
    signedUrl: await createSignedFileUrl(storagePath),
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
  };
};
