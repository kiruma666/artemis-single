declare global {
    interface Promise<T> {
        /**
         * @deprecated
         * React@18 not warns about setState on unmounted components any more
         * https://github.com/facebook/react/pull/22114
         */
        wrap(): CancelablePromise<T>
    }
}

type CancelablePromise<T> = Promise<T> & {
    cancel: (reason?: any) => void,
};

function wrap() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const promise = this;
    if (!(promise instanceof Promise)) {
        throw new Error('Please wrap a promise');
    }

    let rejectCancelable: any;
    const cancelable = new Promise((resolve, reject) => {
        rejectCancelable = reject;
        promise.then(resolve, reject);
    }) as CancelablePromise<any>;

    cancelable.cancel = rejectCancelable;

    return cancelable;
}

Promise.prototype.wrap = wrap;

export default wrap;
