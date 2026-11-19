import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Globe,
    Pencil,
    Plus,
    ShieldCheck,
    Store,
    X,
} from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { toast } from 'sonner';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import { staffStatusStyles } from '@/lib/staff';
import type { StaffMember, StaffShop } from '@/lib/staff';
import { cn, formatDate } from '@/lib/utils';
import admin from '@/routes/admin';

interface StaffDetailsProps {
    member: StaffMember;
    availableRoles: string[];
    availablePermissions: string[];
    availableShops: StaffShop[];
}

const toggle = (list: string[], value: string) =>
    list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

const Caption = ({ children }: { children: ReactNode }) => (
    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {children}
    </p>
);

const ReadOnlyField = ({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) => (
    <div className="space-y-1.5">
        <Caption>{label}</Caption>
        <div className="flex min-h-9 items-center rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
            {children}
        </div>
    </div>
);

const Field = ({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: ReactNode;
}) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {children}
        <InputError message={error} />
    </div>
);

const Section = ({
    title,
    aside,
    children,
}: {
    title: string;
    aside?: ReactNode;
    children: ReactNode;
}) => (
    <section className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-5">
        <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {title}
            </h4>
            {aside}
        </div>
        {children}
    </section>
);

const StaffDetails = ({
    member,
    availableRoles,
    availablePermissions,
    availableShops,
}: StaffDetailsProps) => {
    const getInitials = useInitials();
    const fullName = `${member.firstname} ${member.lastname}`;

    const userForm = useForm({
        firstname: member.firstname,
        lastname: member.lastname,
        email: member.email,
        gender: member.gender,
        phone: member.phone,
        role: member.roles[0] ?? '',
        permissions: member.permissions,
        shops: member.shops.map((shop) => shop.uuid),
    });

    const bind = (key: 'firstname' | 'lastname' | 'email' | 'phone') => ({
        id: key,
        value: userForm.data[key],
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
            userForm.setData(key, event.target.value),
    });

    const toggleValue = (key: 'permissions' | 'shops', value: string) =>
        userForm.setData(key, toggle(userForm.data[key], value));

    const roleOptions =
        availableRoles.length > 0 ? availableRoles : member.roles;

    const permissionOptions = Array.from(
        new Set([...availablePermissions, ...member.permissions]),
    );

    const handleRoleChange = (role: string) =>
        userForm.setData((current) => ({
            ...current,
            role,
            // Managers get every permission preselected, cashiers start with
            // none, and admins already have full access so individual
            // selections are dropped for them.
            permissions:
                role === 'manager'
                    ? [...permissionOptions]
                    : role === 'admin' || role === 'cashier'
                      ? []
                      : current.permissions,
            shops: role === 'admin' ? [] : current.shops,
        }));

    const selectedShops = availableShops.filter((shop) =>
        userForm.data.shops.includes(shop.uuid),
    );
    const unselectedShops = availableShops.filter(
        (shop) => !userForm.data.shops.includes(shop.uuid),
    );

    const hasFullAccess = userForm.data.role === 'admin';

    const handleUpdateStaff = () => {
        userForm.patch(admin.staffUpdate({ user: member.uuid }).url, {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.error) {
                    toast.error(errors.error);
                }
            },
        });
    };

    return (
        <>
            <DashboardInnerLayout>
                <div className="flex flex-col gap-4 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <Button
                            variant={'secondary'}
                            className="cursor-pointer"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft />
                        </Button>

                        <Avatar className="h-12 w-12 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                {getInitials(fullName)}
                            </AvatarFallback>
                        </Avatar>

                        <Heading
                            variant="small"
                            title={fullName}
                            description={member.email}
                        />
                    </div>

                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 self-start rounded border px-2.5 py-1 font-mono text-[10px] font-medium capitalize sm:self-auto',
                            staffStatusStyles[member.status],
                        )}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {member.status}
                    </span>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    <Section title="Account Information">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                id="firstname"
                                label="First Name"
                                error={userForm.errors.firstname}
                            >
                                <Input
                                    {...bind('firstname')}
                                    placeholder="First name"
                                />
                            </Field>

                            <Field
                                id="lastname"
                                label="Last Name"
                                error={userForm.errors.lastname}
                            >
                                <Input
                                    {...bind('lastname')}
                                    placeholder="Last name"
                                />
                            </Field>

                            <Field
                                id="gender"
                                label="Gender"
                                error={userForm.errors.gender}
                            >
                                <Select
                                    value={userForm.data.gender}
                                    onValueChange={(value) =>
                                        userForm.setData(
                                            'gender',
                                            value as StaffMember['gender'],
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="gender"
                                        className="w-full cursor-pointer bg-background"
                                    >
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">
                                            Male
                                        </SelectItem>
                                        <SelectItem value="female">
                                            Female
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field
                                id="email"
                                label="Email Address (Optional)"
                                error={userForm.errors.email}
                            >
                                <Input
                                    {...bind('email')}
                                    type="email"
                                    placeholder="Email address"
                                />
                            </Field>

                            <Field
                                id="phone"
                                label="Phone Number"
                                error={userForm.errors.phone}
                            >
                                <Input
                                    {...bind('phone')}
                                    type="tel"
                                    placeholder="Phone number"
                                />
                            </Field>

                            <ReadOnlyField label="Member Since">
                                {formatDate(member.created_at)}
                            </ReadOnlyField>

                            <ReadOnlyField label="Staff ID">
                                <span className="font-mono text-xs break-all">
                                    {member.uuid}
                                </span>
                            </ReadOnlyField>
                        </div>
                    </Section>

                    <Section title="Roles & Permissions">
                        <div className="space-y-2">
                            <Caption>Role</Caption>

                            {roleOptions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No roles defined
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {roleOptions.map((role) => (
                                        <label
                                            key={role}
                                            htmlFor={`role-${role}`}
                                            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground capitalize transition-colors hover:bg-muted/60"
                                        >
                                            <Checkbox
                                                id={`role-${role}`}
                                                checked={
                                                    userForm.data.role === role
                                                }
                                                onCheckedChange={(checked) =>
                                                    checked === true &&
                                                    handleRoleChange(role)
                                                }
                                                className="cursor-pointer"
                                            />
                                            {role}
                                        </label>
                                    ))}
                                </div>
                            )}

                            <InputError message={userForm.errors.role} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Caption>Permissions</Caption>
                                {!hasFullAccess && (
                                    <span className="text-[11px] text-muted-foreground">
                                        {userForm.data.permissions.length} of{' '}
                                        {permissionOptions.length} selected
                                    </span>
                                )}
                            </div>

                            {hasFullAccess ? (
                                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck className="h-4 w-4" />
                                    </span>
                                    <div className="leading-tight">
                                        <p className="text-sm font-medium text-foreground">
                                            Access to all permissions
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Admins automatically get every
                                            permission, so no individual
                                            selection is needed.
                                        </p>
                                    </div>
                                </div>
                            ) : permissionOptions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No permissions defined
                                </p>
                            ) : (
                                <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
                                    {permissionOptions.map((permission) => (
                                        <label
                                            key={permission}
                                            htmlFor={`permission-${permission}`}
                                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm leading-snug text-foreground transition-colors first-letter:uppercase hover:bg-muted/60"
                                        >
                                            <Checkbox
                                                id={`permission-${permission}`}
                                                checked={userForm.data.permissions.includes(
                                                    permission,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleValue(
                                                        'permissions',
                                                        permission,
                                                    )
                                                }
                                                className="mt-0.5 cursor-pointer"
                                            />
                                            {permission}
                                        </label>
                                    ))}
                                </div>
                            )}

                            <InputError message={userForm.errors.permissions} />
                        </div>
                    </Section>

                    <div className="lg:col-span-2">
                        <Section
                            title="Shop Access"
                            aside={
                                !hasFullAccess &&
                                selectedShops.length > 0 && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {selectedShops.length}
                                    </span>
                                )
                            }
                        >
                            {hasFullAccess ? (
                                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Globe className="h-4 w-4" />
                                    </span>
                                    <div className="leading-tight">
                                        <p className="text-sm font-medium text-foreground">
                                            Access to all shops
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Admins can manage every shop, so no
                                            individual assignment is needed.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {selectedShops.length === 0 ? (
                                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                <Store className="h-4 w-4" />
                                            </span>
                                            <p className="text-sm text-muted-foreground">
                                                No shops assigned yet.
                                            </p>
                                        </div>
                                    ) : (
                                        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                            {selectedShops.map((shop) => (
                                                <li
                                                    key={shop.uuid}
                                                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                                                >
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Store className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium break-words text-foreground">
                                                            {shop.name}
                                                        </p>
                                                        {shop.location && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {shop.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={`Remove ${shop.name}`}
                                                        onClick={() =>
                                                            toggleValue(
                                                                'shops',
                                                                shop.uuid,
                                                            )
                                                        }
                                                        className="shrink-0 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {unselectedShops.length > 0 && (
                                        <div className="space-y-2">
                                            <Caption>Add shop</Caption>
                                            <div className="flex flex-wrap gap-2">
                                                {unselectedShops.map((shop) => (
                                                    <Button
                                                        key={shop.uuid}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            toggleValue(
                                                                'shops',
                                                                shop.uuid,
                                                            )
                                                        }
                                                        className="cursor-pointer gap-1.5 rounded-lg bg-background text-xs font-medium"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        {shop.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <InputError message={userForm.errors.shops} />
                        </Section>
                    </div>
                </div>

                <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={userForm.processing}
                        className="cursor-pointer rounded-xl border-border text-xs font-semibold"
                        onClick={() => window.history.back()}
                    >
                        Back
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpdateStaff}
                        disabled={userForm.processing}
                        className="cursor-pointer rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        {userForm.processing ? (
                            <Spinner />
                        ) : (
                            <Pencil className="h-3.5 w-3.5" />
                        )}
                        Update Staff
                    </Button>
                </div>
            </DashboardInnerLayout>
        </>
    );
};

StaffDetails.layout = {
    breadcrumbs: [
        {
            title: 'Staff Management',
            href: admin.staff(),
        },
    ],
};

export default StaffDetails;
