/* eslint-disable no-console */

export const getTimer = (name: string) => {
    const debugEnabled = localStorage.debug === name;

    return {
        start: () => debugEnabled && console.time(name),
        log: (...data: any[]) => debugEnabled && console.timeLog(name, ...data),
        end: () => debugEnabled && console.timeEnd(name)
    };
};
