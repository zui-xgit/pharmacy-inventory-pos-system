import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface ConfirmAlertDialogProps {
    trigger: React.ReactNode;
    title: string;
    description: React.ReactNode;
    actionText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

export function ConfirmAlertDialog({
    trigger,
    title,
    description,
    actionText = 'Continue',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
}: ConfirmAlertDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    {/* <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                        <AlertCircle />
                    </AlertDialogMedia> */}
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        className="bg-destructive text-white"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="cursor-pointer"
                    >
                        {actionText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
