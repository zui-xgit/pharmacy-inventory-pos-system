import Heading from '@/components/heading';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';

const Logs = () => {
    return (
        <DashboardInnerLayout>
            <Heading title="Logs" description="Activity logs in this shop" />
        </DashboardInnerLayout>
    );
};

export default Logs;

Logs.layout = {
    breadcrumbs: [
        {
            title: 'Logs',
            href: '#',
        },
    ],
};
