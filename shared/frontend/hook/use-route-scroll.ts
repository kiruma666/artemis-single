import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function useRouteScroll({timeout = 1000, scrollParam}: {
    timeout?: number
    scrollParam?: boolean | ScrollIntoViewOptions
} = {}) {
    const {pathname, hash} = useLocation();
    useEffect(() => {
        if (hash) {
            try {
                const intervalId = setInterval(() => {
                    const element = document.querySelector(hash);
                    if (element) {
                        element.scrollIntoView(scrollParam ?? {block: 'center'});
                        clearInterval(intervalId);
                    }
                }, 100);

                const timeoutId = setTimeout(() => {
                    clearInterval(intervalId);
                }, timeout);

                return () => {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                };
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('scroll to hash failed', e);
            }
        }

        window.scrollTo(0, 0);
    }, [pathname, hash]);
}
