import {useEffect, useState} from 'react';

// consider it is loading until the variable is not change any more
export const useVariableLoading = (variable: any, delay = 300) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay, variable]);

    return {loading};
};

export const useContinuousLoading = (isLoading?: boolean, delay = 300) => {
    const [loading, setLoading] = useState(isLoading);

    useEffect(() => {
        if (isLoading) {
            setLoading(true);

            return;
        }

        const timeout = setTimeout(() => setLoading(false), delay); // make the loading more smooth

        return () => {
            clearTimeout(timeout);
        };
    }, [delay, isLoading]);

    return {loading};
};
