import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function avatarStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("avatars/")) return value.slice(8);
  try {
    const url = new URL(value);
    if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) return null;
    const prefix = "/storage/v1/object/public/avatars/";
    return url.pathname.startsWith(prefix) ? decodeURIComponent(url.pathname.slice(prefix.length)) : null;
  } catch { return null; }
}

export function ProfileImage({ value, className }: { value: string; className: string }) {
  const path = avatarStoragePath(value);
  const { data } = useQuery({
    queryKey: ["avatar-image", value],
    queryFn: async () => {
      if (!path) return value;
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
  return data ? <img src={data} alt="Profile picture" className={className} /> : <span className={className} />;
}