import { useEffect } from 'react';
import { useAuth } from './AuthContext';

export default function NavigationTracker() {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        let lastUrl = window.location.href;

        const notifyNavigation = () => {
            const currentUrl = window.location.href;
            if (currentUrl === lastUrl) return;
            lastUrl = currentUrl;

            window.parent?.postMessage({
                type: "app_changed_url",
                url: currentUrl
            }, '*');
        };

        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');

        const interval = window.setInterval(notifyNavigation, 300);
        return () => window.clearInterval(interval);
    }, [isAuthenticated]);

    return null;
}