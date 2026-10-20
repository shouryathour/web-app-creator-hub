import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Owner removes a person who asked for access: mark removed, then block the account. */
export const removeAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.userId ?? "")) throw new Error("Invalid user");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reject_access", { _user: data.userId });
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" });
    if (banErr) throw new Error(banErr.message);
    return { ok: true };
  });
