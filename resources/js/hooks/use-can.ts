import { Auth, Permission, Role } from '@/types';
import { usePage } from '@inertiajs/react';

export function useCan() {
    const { auth } = usePage<{ auth: Auth }>().props;

    return {
        can: (permission: Permission): boolean =>
            auth.user.permissions.includes(permission),
        hasRole: (role: Role): boolean => auth.user.roles.includes(role),
        hasAnyRole: (roles: Role[]) =>
            roles.some((role) => auth.user.roles.includes(role)),
    };
}
