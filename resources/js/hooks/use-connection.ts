import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function useConnection() {
    useEffect(() => {
        const offException = router.on('networkError', (event) => {
            event.preventDefault();
            toast.error('No internet connection. Check your data bundle', {
                position: 'top-center',
            });
        });

        // const offSuccess = router.on('success', () => toast.dismiss('net'));

        return () => {
            offException();
        };
    }, []);
}
