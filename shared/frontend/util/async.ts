type AsyncFunction = (...args: any[]) => Promise<any>;

export function catchAsync<T extends AsyncFunction>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
    return async function(...args: Parameters<T>): Promise<ReturnType<T> | void> {
        try {
            return await fn(...args);
        } catch (err) {
            console.error('catchAsync:', err); // eslint-disable-line no-console
        }
    };
}
