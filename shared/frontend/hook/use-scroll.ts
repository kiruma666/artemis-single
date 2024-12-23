import {useEffect, useState} from 'react';
import _ from 'underscore';

// ref: https://github.com/streamich/react-use/blob/master/src/useScroll.ts
// add support for Element scroll someday if needed

export default function useScroll() {
    const [position, setPosition] = useState({x: 0, y: 0});

    useEffect(() => {
        const handler = _.throttle(() => {
            setPosition({
                x: window.scrollX,
                y: window.scrollY
            });
        }, 50);

        window.addEventListener('scroll', handler, {
            passive: true
        });

        return () => window.removeEventListener('scroll', handler);
    }, []);

    return position;
}
