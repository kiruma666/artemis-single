export const findDuplicated = (texts: string[]): string[] => {
    const map = texts.reduce((acc, account) => {
        acc[account.toLowerCase()] = (acc[account.toLowerCase()] ?? 0) + 1;

        return acc;
    }, {} as Record<string, number>);

    return Object.keys(map).filter(account => map[account] > 1);
};
