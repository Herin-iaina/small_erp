import { useAuthStore } from "@/stores/authStore";

function checkPermission(
  userPermissions: string[],
  required: string
): boolean {
  if (userPermissions.includes("*.*")) return true;

  const [reqModule, reqAction] = required.split(".");

  return userPermissions.some((perm) => {
    const [pModule, pAction] = perm.split(".");
    if (pModule === "*" || pModule === reqModule) {
      if (pAction === "*" || pAction === reqAction) return true;
    }
    return false;
  });
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];

  return {
    /** Check a single permission */
    can: (permission: string): boolean =>
      checkPermission(permissions, permission),

    /** Check if user has ANY of the given permissions */
    canAny: (perms: string[]): boolean =>
      perms.some((p) => checkPermission(permissions, p)),

    /** Check if user has ALL of the given permissions */
    canAll: (perms: string[]): boolean =>
      perms.every((p) => checkPermission(permissions, p)),

    /** Is the user a superadmin? */
    isSuperAdmin: permissions.includes("*.*"),

    /** Does the user have access to a specific module? */
    hasModule: (mod: string): boolean =>
      checkPermission(permissions, `${mod}.view`),

    permissions,
  };
}
