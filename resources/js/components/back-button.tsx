import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

const BackButton = () => {
    return (
        <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => window.history.back()}
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
    );
};

export default BackButton;
