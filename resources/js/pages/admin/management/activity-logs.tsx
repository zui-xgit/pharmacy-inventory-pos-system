import Heading from '@/components/heading';
import DashboardInnerLayout from '@/layouts/app/dashboard-inner-layout';

const ActivityLogs = () => {
    return (
        <DashboardInnerLayout>
            <Heading
                variant="small"
                title="Activity Logs"
                description="Activity logs across all shops"
            />
        </DashboardInnerLayout>
    );
};

export default ActivityLogs;
