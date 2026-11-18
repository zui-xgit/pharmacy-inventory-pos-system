import { Link } from '@inertiajs/react';

import {
    Activity as ActivityIcon,
    ArrowRight,
    Boxes,
    CalendarDays,
    Clock,
    ExternalLink,
    FlaskConical,
    History,
    Inbox,
    Package,
    Receipt,
    Store,
    UserRound,
    Users,
} from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '../ui/button';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ActivityChange {
    key: string;
    label: string;
    old: string | null;
    new: string | null;
}

interface ActivityProperty {
    key: string;
    label: string;
    value: string | null;
}

interface ActivitySubject {
    type: string;
    label: string;
    url: string | null;
}

interface ActivityCauser {
    uuid: string | null;
    name: string;
    initials: string;
}

interface ActivityItem {
    id: number;
    log_name: string;
    event: string;
    description: string;
    created_at: string | null;
    created_at_human: string | null;
    causer: ActivityCauser | null;
    subject: ActivitySubject | null;
    changes: ActivityChange[];
    properties: ActivityProperty[];
}

const eventStyles: Record<string, string> = {
    created:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    updated:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
    deleted:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
    restored:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

const logStyles: Record<string, string> = {
    catalog:
        'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
    inventory:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    sales: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    staff: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
    shop: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    system: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
};

const subjectIcons: Record<string, typeof Package> = {
    'Dosage form': FlaskConical,
    Product: Package,
    Batch: Boxes,
    Sale: Receipt,
    'Staff member': UserRound,
    Shop: Store,
};

const formatDate = (value: string | null): string => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const ShopActivityDetailsDialog = ({
    activity,
    onOpenChange,
}: {
    activity: ActivityItem | null;
    onOpenChange: (open: boolean) => void;
}) => {
    const SubjectIcon = activity?.subject
        ? (subjectIcons[activity.subject.type] ?? ActivityIcon)
        : ActivityIcon;

    return (
        <Dialog open={Boolean(activity)} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-x-hidden overflow-y-auto sm:max-w-4xl [&>*]:min-w-0">
                {activity && (
                    <>
                        <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'font-mono text-[10px] tracking-wide uppercase',
                                        eventStyles[activity.event],
                                    )}
                                >
                                    {activity.event}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'font-mono text-[10px] tracking-wide uppercase',
                                        logStyles[activity.log_name],
                                    )}
                                >
                                    {activity.log_name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {activity.created_at_human}
                                </span>
                            </div>
                            <DialogTitle className="text-base leading-snug font-semibold text-foreground">
                                {activity.description}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Full details of the selected activity log entry.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-3 border-b border-border/60 py-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Subject
                                </p>
                                {activity.subject ? (
                                    <div className="flex items-center gap-2">
                                        <SubjectIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm font-medium text-foreground">
                                            {activity.subject.label}
                                        </span>
                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            {activity.subject.type}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Not attached to a record
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Performed by
                                </p>
                                {activity.causer ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                                {activity.causer.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-foreground">
                                            {activity.causer.name}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        System
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Recorded at
                                </p>
                                <p className="text-sm text-foreground">
                                    {formatDate(activity.created_at)}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Activity ID
                                </p>
                                <p className="font-mono text-sm text-foreground">
                                    #{activity.id}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 py-4">
                            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                Changes
                            </p>

                            {activity.changes.length === 0 ? (
                                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                                    No attribute changes were recorded for this
                                    event.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="h-9 pl-3 text-xs">
                                                    Attribute
                                                </TableHead>
                                                <TableHead className="h-9 text-xs">
                                                    Before
                                                </TableHead>
                                                <TableHead className="h-9 pr-3 text-xs">
                                                    After
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activity.changes.map((change) => (
                                                <TableRow key={change.key}>
                                                    <TableCell className="py-2 pl-3 text-xs font-medium text-foreground">
                                                        {change.label}
                                                    </TableCell>
                                                    <TableCell className="py-2 font-mono text-[11px] break-all text-muted-foreground">
                                                        {change.old ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2 pr-3 font-mono text-[11px] break-all text-foreground">
                                                        {change.new ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        {activity.properties.length > 0 && (
                            <div className="space-y-2 border-t border-border/60 py-4">
                                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    Additional data
                                </p>
                                <div className="divide-y rounded-lg border">
                                    {activity.properties.map((property) => (
                                        <div
                                            key={property.key}
                                            className="flex items-start justify-between gap-4 px-3 py-2"
                                        >
                                            <span className="text-xs text-muted-foreground">
                                                {property.label}
                                            </span>
                                            <span className="max-w-[60%] text-right font-mono text-[11px] break-all text-foreground">
                                                {property.value ?? '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activity.subject?.url && (
                            <div className="flex justify-end border-t border-border/60 pt-4">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer rounded-lg"
                                    asChild
                                >
                                    <Link href={activity.subject.url}>
                                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                        Open{' '}
                                        {activity.subject.type.toLowerCase()}
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ShopActivityDetailsDialog;
