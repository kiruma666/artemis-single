import {sendMessage} from './tele-bot';

type IPInfo = {
    address: string
    violationCount: number
    lastAccessTime: number
    notified?: boolean
}

const ipMap: Record<string, IPInfo> = {};
const MIN_DURATION_BEFORE_RESET = 30 * 60 * 1e3; // 30 minute
export const MAX_VIOLATION_COUNT_BEFORE_BLOCK = 10;

export const getIpMap = () => ipMap;

export const increaseViolationCount = (ip: string, amount = 1) => {
    const ipInfo: IPInfo = ipMap[ip] ?? {
        address: ip,
        violationCount: 0,
        lastAccessTime: 0
    };

    ipInfo.violationCount += amount;
    ipInfo.lastAccessTime = Date.now();

    ipMap[ip] = ipInfo;

    console.log(`[Access Control] IP: ${ip}, violationCount: ${ipInfo.violationCount}`);
};

export const checkBlockedIp = (ip: string, tag: string) => {
    const ipInfo = ipMap[ip];

    if (!ipInfo) {
        return false;
    }

    if (Date.now() - ipInfo.lastAccessTime > MIN_DURATION_BEFORE_RESET) {
        delete ipMap[ip]; // reset

        console.log(`[Access Control] Unblocked IP: ${ip}`);
        sendMessage(`${tag}[Access Control] Unblocked IP: ${ip}`, {
            channel: 'dev',
            group: 'Access Control'
        });

        return false;
    }

    ipInfo.lastAccessTime = Date.now(); // update last access time

    if (ipInfo.violationCount < MAX_VIOLATION_COUNT_BEFORE_BLOCK) {
        return false;
    }

    console.log(`[Access Control] Blocked IP: ${ip}`);

    if (!ipInfo.notified) {
        sendMessage(`${tag}[Access Control] Blocked IP: ${ip}`, {
            channel: 'dev',
            group: 'Access Control'
        });

        ipInfo.notified = true;
    }

    return true;
};
