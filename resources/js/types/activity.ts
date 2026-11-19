export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface ActivityChange {
    key: string;
    label: string;
    old: string | null;
    new: string | null;
}

export interface ActivityProperty {
    key: string;
    label: string;
    value: string | null;
}

export interface ActivitySubject {
    type: string;
    label: string;
    url: string | null;
}

export interface ActivityCauser {
    uuid: string | null;
    name: string;
    initials: string;
}

export interface ActivityShop {
    uuid: string;
    name: string;
}

export interface ActivityItem {
    id: number;
    log_name: string;
    event: string;
    description: string;
    created_at: string | null;
    created_at_human: string | null;
    shop: ActivityShop | null;
    causer: ActivityCauser | null;
    subject: ActivitySubject | null;
    changes: ActivityChange[];
    properties: ActivityProperty[];
}

export interface PaginatedActivities {
    data: ActivityItem[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
}

export interface ActivityLogsProps {
    activities: PaginatedActivities;
    stats: {
        total: number;
        today: number;
        week: number;
        shops: number;
    };
    options: {
        log_names: string[];
        events: string[];
        causers: { uuid: string; name: string }[];
        shops: { value: string; label: string }[];
    };
    filters: {
        search?: string;
        log?: string;
        event?: string;
        causer?: string;
        shop?: string;
        from?: string;
        to?: string;
    };
}
