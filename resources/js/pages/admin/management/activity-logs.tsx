import { Head, Link, router } from '@inertiajs/react';
import {
    Activity as ActivityIcon,
    ArrowRight,
    CalendarDays,
    Clock,
    History,
    Inbox,
    Store,
} from 'lucide-react';
import { useState } from 'react';

import DatePicker from '@/components/dashboard/date-picker';
import StatCard from '@/components/dashboard/stat-card';
import Heading from '@/components/heading';
import RefreshButton from '@/components/refresh-button';
import SearchInput from '@/components/search-input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';
import { cn } from '@/lib/utils';
import admin from '@/routes/admin';
import {
    ActivityItem,
    ActivityLogsProps,
    PaginatedActivities,
} from '@/types/activity';
import { eventStyles, logStyles, subjectIcons } from '@/lib/activity';
import ActivityDetailsDialog from '@/components/dialogs/activity-details-dialog';

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

const ActivityPagination = ({
    activities,
}: {
    activities: PaginatedActivities;
}) => {
    if (activities.last_page <= 1) {
        return null;
    }

    const previous = activities.links[0];
    const next = activities.links[activities.links.length - 1];
    const pages = activities.links.slice(1, -1);

    return (
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                    {activities.from ?? 0}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                    {activities.to ?? 0}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">
                    {activities.total}
                </span>{' '}
                events
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    asChild={Boolean(previous.url)}
                    disabled={!previous.url}
                    className="rounded-lg"
                >
                    {previous.url ? (
                        <Link href={previous.url} preserveScroll>
                            Previous
                        </Link>
                    ) : (
                        <span>Previous</span>
                    )}
                </Button>

                {pages.map((link, index) =>
                    link.url ? (
                        <Button
                            key={link.label}
                            variant={link.active ? 'default' : 'outline'}
                            size="icon-sm"
                            asChild
                            className="rounded-lg"
                        >
                            <Link href={link.url} preserveScroll>
                                {link.label}
                            </Link>
                        </Button>
                    ) : (
                        <span
                            key={`ellipsis-${index}`}
                            className="px-1 text-xs text-muted-foreground"
                        >
                            …
                        </span>
                    ),
                )}

                <Button
                    variant="outline"
                    size="sm"
                    asChild={Boolean(next.url)}
                    disabled={!next.url}
                    className="rounded-lg"
                >
                    {next.url ? (
                        <Link href={next.url} preserveScroll>
                            Next
                        </Link>
                    ) : (
                        <span>Next</span>
                    )}
                </Button>
            </div>
        </CardFooter>
    );
};

const ActivityLogs = ({
    activities,
    stats,
    options,
    filters,
}: ActivityLogsProps) => {
    const [selected, setSelected] = useState<ActivityItem | null>(null);
    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const logsUrl = admin.activityLogs();

    const isFiltered = Boolean(
        filters.search ||
        filters.log ||
        filters.event ||
        filters.causer ||
        filters.shop ||
        filters.from ||
        filters.to,
    );

    const applyFilter = (
        key: 'log' | 'event' | 'causer' | 'shop',
        value: string,
    ) => {
        const next = value === 'all' ? '' : value;

        router.get(
            logsUrl,
            { ...filters, [key]: next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applyDateRange = () => {
        router.get(
            logsUrl,
            { ...filters, from, to },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Activity Logs" />

            <DashboardInnerLayout>
                <div className="flex flex-col gap-4 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        variant="small"
                        title="Activity Logs"
                        description="Every change across your shops and admin dashboards, who made it and when."
                    />
                    <RefreshButton href={logsUrl} />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total events"
                        value={stats.total.toLocaleString()}
                        icon={
                            <History className="h-4 w-4 text-muted-foreground" />
                        }
                        subtitle="Across every shop and admin action"
                    />
                    <StatCard
                        title="Today"
                        value={stats.today.toLocaleString()}
                        icon={<Clock className="h-4 w-4 text-sky-600" />}
                        subtitle="Events since midnight"
                        valueClassName={stats.today > 0 ? 'text-sky-600' : ''}
                    />
                    <StatCard
                        title="Last 7 days"
                        value={stats.week.toLocaleString()}
                        icon={
                            <CalendarDays className="h-4 w-4 text-emerald-600" />
                        }
                        subtitle="Rolling weekly window"
                        valueClassName="text-emerald-600"
                    />
                    <StatCard
                        title="Shops covered"
                        value={stats.shops.toLocaleString()}
                        icon={
                            <Store className="h-4 w-4 text-muted-foreground" />
                        }
                        subtitle="Branches with recorded activity"
                    />
                </div>

                <div className="mt-6 flex flex-col gap-3 border-b border-border/40 pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Activity timeline
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {activities.total}
                        </span>
                    </h2>

                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
                        <div className="sm:col-span-2 lg:col-span-4">
                            <SearchInput
                                href={logsUrl}
                                filters={filters}
                                placeholder="Search description, log, shop or user..."
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={filters.log || 'all'}
                                onValueChange={(value) =>
                                    applyFilter('log', value)
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-full cursor-pointer bg-background"
                                >
                                    <SelectValue placeholder="All logs" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All logs
                                    </SelectItem>
                                    {options.log_names.map((logName) => (
                                        <SelectItem
                                            key={logName}
                                            value={logName}
                                            className="capitalize"
                                        >
                                            {logName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={filters.event || 'all'}
                                onValueChange={(value) =>
                                    applyFilter('event', value)
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-full cursor-pointer bg-background"
                                >
                                    <SelectValue placeholder="All events" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All events
                                    </SelectItem>
                                    {options.events.map((event) => (
                                        <SelectItem
                                            key={event}
                                            value={event}
                                            className="capitalize"
                                        >
                                            {event}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={filters.shop || 'all'}
                                onValueChange={(value) =>
                                    applyFilter('shop', value)
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-full cursor-pointer bg-background"
                                >
                                    <SelectValue placeholder="All shops" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All shops
                                    </SelectItem>
                                    {options.shops.map((shop) => (
                                        <SelectItem
                                            key={shop.value}
                                            value={shop.value}
                                        >
                                            {shop.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={filters.causer || 'all'}
                                onValueChange={(value) =>
                                    applyFilter('causer', value)
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-full cursor-pointer bg-background"
                                >
                                    <SelectValue placeholder="Anyone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Anyone</SelectItem>
                                    {options.causers.map((causer) => (
                                        <SelectItem
                                            key={causer.uuid}
                                            value={causer.uuid}
                                        >
                                            {causer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <DatePicker
                            value={from}
                            onChange={setFrom}
                            placeholder="From date"
                        />
                        <DatePicker
                            value={to}
                            onChange={setTo}
                            placeholder="To date"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer rounded-lg"
                            onClick={applyDateRange}
                            disabled={!from && !to}
                        >
                            Apply range
                        </Button>

                        {isFiltered && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer rounded-lg text-muted-foreground"
                                asChild
                            >
                                <Link href={logsUrl}>Clear filters</Link>
                            </Button>
                        )}
                    </div>
                </div>

                {activities.data.length === 0 ? (
                    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Inbox className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-foreground">
                            {isFiltered
                                ? 'No activity matches your filters'
                                : 'No activity recorded yet'}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {isFiltered
                                ? 'Try a different search term, log, event, shop, user or date range.'
                                : 'Changes made in your shops or from the admin dashboard will appear here.'}
                        </p>
                    </div>
                ) : (
                    <Card className="mt-4 gap-0 overflow-hidden py-0">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="pl-4">
                                            When
                                        </TableHead>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Shop</TableHead>
                                        <TableHead>Performed by</TableHead>
                                        <TableHead className="pr-4 text-right">
                                            Log
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.data.map((activity) => {
                                        const SubjectIcon = activity.subject
                                            ? (subjectIcons[
                                                  activity.subject.type
                                              ] ?? ActivityIcon)
                                            : ActivityIcon;

                                        return (
                                            <TableRow
                                                key={activity.id}
                                                className="cursor-pointer align-top"
                                                onClick={() =>
                                                    setSelected(activity)
                                                }
                                            >
                                                <TableCell className="py-3 pl-4">
                                                    <div className="flex items-start gap-2">
                                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium whitespace-nowrap text-foreground">
                                                                {activity.created_at_human ??
                                                                    '—'}
                                                            </p>
                                                            <p className="text-[11px] whitespace-nowrap text-muted-foreground">
                                                                {formatDate(
                                                                    activity.created_at,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="max-w-[22rem] py-3">
                                                    <div className="flex items-start gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'mt-0.5 shrink-0 font-mono text-[10px] tracking-wide uppercase',
                                                                eventStyles[
                                                                    activity
                                                                        .event
                                                                ],
                                                            )}
                                                        >
                                                            {activity.event}
                                                        </Badge>
                                                        <p className="line-clamp-2 text-sm text-foreground">
                                                            {
                                                                activity.description
                                                            }
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-3">
                                                    {activity.subject ? (
                                                        <div className="flex items-center gap-2">
                                                            <SubjectIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <div className="min-w-0">
                                                                <p className="max-w-[14rem] truncate text-xs font-medium text-foreground">
                                                                    {
                                                                        activity
                                                                            .subject
                                                                            .label
                                                                    }
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {
                                                                        activity
                                                                            .subject
                                                                            .type
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="py-3">
                                                    {activity.shop ? (
                                                        <div className="flex items-center gap-2">
                                                            <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <span className="max-w-[10rem] truncate text-xs font-medium text-foreground">
                                                                {
                                                                    activity
                                                                        .shop
                                                                        .name
                                                                }
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <ArrowRight className="h-3 w-3" />
                                                            Admin / system
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="py-3">
                                                    {activity.causer ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-7 w-7">
                                                                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                                                    {
                                                                        activity
                                                                            .causer
                                                                            .initials
                                                                    }
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="max-w-[10rem] truncate text-xs font-medium text-foreground">
                                                                {
                                                                    activity
                                                                        .causer
                                                                        .name
                                                                }
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <ArrowRight className="h-3 w-3" />
                                                            System
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="py-3 pr-4 text-right">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'font-mono text-[10px] tracking-wide uppercase',
                                                            logStyles[
                                                                activity
                                                                    .log_name
                                                            ],
                                                        )}
                                                    >
                                                        {activity.log_name}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>

                        <ActivityPagination activities={activities} />
                    </Card>
                )}

                <ActivityDetailsDialog
                    activity={selected}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelected(null);
                        }
                    }}
                />
            </DashboardInnerLayout>
        </>
    );
};

ActivityLogs.layout = {
    breadcrumbs: [
        {
            title: 'Logs',
            href: admin.activityLogs(),
        },
    ],
};

export default ActivityLogs;
