export type Permission =
    | 'inventory and stock management'
    | 'reports and insights management'
    | 'staff management';

export type Role = 'admin' | 'manager' | 'cashier';

export type User = {
    uuid: string;
    firstname: string;
    lastname: string;
    email: string;
    roles: Role[];
    permissions: Permission[];
    shop_uuid: string;
    user_shops_count: number;
    shops_count: number;

    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */
