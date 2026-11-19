import {
    Boxes,
    FlaskConical,
    Package,
    Receipt,
    Store,
    UserRound,
} from 'lucide-react';

export const eventStyles: Record<string, string> = {
    created:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    updated:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
    deleted:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
    restored:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

export const logStyles: Record<string, string> = {
    catalog:
        'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
    inventory:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    sales: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    staff: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
    shop: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-300',
    system: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
};

export const subjectIcons: Record<string, typeof Package> = {
    'Dosage form': FlaskConical,
    Product: Package,
    Batch: Boxes,
    Sale: Receipt,
    'Staff member': UserRound,
    Shop: Store,
};
