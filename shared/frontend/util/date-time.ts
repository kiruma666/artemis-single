import {BigNumber} from 'ethers';
import {DateTime} from 'luxon';

export const WEEK = 86400 * 7;

export const getNowSeconds = () => {
    return Math.floor(DateTime.local().toSeconds());
};

export const getCurrentWeekStartSeconds = () => {
    const nowSeconds = Math.floor(DateTime.local().toSeconds());
    const curWeekStart = Math.floor(nowSeconds / WEEK) * WEEK;

    return curWeekStart;
};

export const getNextWeekStartSeconds = () => WEEK + getCurrentWeekStartSeconds();

export const getLockedStartWithTime = (timeStamp: number) => {
    const curWeekStart = Math.floor(timeStamp / WEEK) * WEEK;

    return curWeekStart + WEEK;
};

export const getWeekTimeListWithin = (startTimeStamp: number|null, endTimeStamp: number) => { //前闭后开
    if (!startTimeStamp) startTimeStamp = getCurrentWeekStartSeconds();
    let currentTime = Math.floor(startTimeStamp / WEEK) * WEEK;
    const weekTimeList = [];

    while (currentTime >= startTimeStamp && currentTime < endTimeStamp) {
        weekTimeList.push(currentTime);
        currentTime += WEEK;
    }

    return weekTimeList;
};

export const getLockExpiryDateSeconds = (lockWeek: number) => {
    const curWeekStart = getCurrentWeekStartSeconds();

    return curWeekStart + ((lockWeek + 1) * WEEK);
};

export const getExpiryDateSeconds = (week: number) => {
    return getNowSeconds() + (week * WEEK);
};

export const getDateFromSeconds = (secondsStamp: number | BigNumber, format = DateTime.DATE_MED) => {
    const secondsStampNumber = typeof secondsStamp === 'number' ? secondsStamp : Number(secondsStamp.toString());

    return DateTime.fromMillis(secondsStampNumber * 1000)?.toUTC()?.setLocale('en')?.toLocaleString(format);
};

export const getLockExpiryDate = (lockWeek?: number) => {
    if (!lockWeek) return '';
    const secondsStamp = getLockExpiryDateSeconds(lockWeek);

    const expiryDate = getDateFromSeconds(secondsStamp);

    return expiryDate;
};

export const getExpiryDate = (week?: number) => {
    if (!week) return '';
    const secondsStamp = getExpiryDateSeconds(week);

    const expiryDate = getDateFromSeconds(secondsStamp);

    return expiryDate;
};

export const getBetweenWeeksFloor = (secondsStamp: number) => {
    if (!secondsStamp) return null;

    const betweenSeconds = Math.abs(secondsStamp - DateTime.local().toSeconds());

    return Math.floor(betweenSeconds / WEEK);
};

export const isExpired = (expiry: Date | undefined) => {
    if (!expiry) {
        return false;
    }

    const now = Date.now();
    const expiryDate = new Date(expiry);

    return now >= expiryDate.getTime();
};

export const getPoolExpiryText = (expiry: Date | undefined) => {
    if (!expiry) return '--';
    if (isExpired(expiry)) return 'Matured';

    const now = Date.now();
    const expiryDate = new Date(expiry);

    return `Maturity: ${expiryDate.toISOString().split('T')[0]} (${Math.floor((expiryDate.getTime() - now) / (24 * 60 * 60 * 1e3))} days)`;
};
