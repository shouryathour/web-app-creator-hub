import { PERMISSION_GROUPS } from "@/lib/permissions";

export { PERMISSION_GROUPS };

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.keys.map((k) => k.key));

export type PermissionPreset = {
  id: string;
  name: string;
  permission_keys: string[];
  is_builtin: boolean;
};
