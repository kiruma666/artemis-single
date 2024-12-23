import {BigNumber} from 'ethers';

import {getMaskedAddress} from '@shared/fe/util/address';

import {getEthenaPointsGroup, getEthenaRewards} from './ethena.fi';
import {getEtherFiLRT2, getEtherFiPointsGroup, getEtherFiPortfolioV3} from './ether.fi';
import {getKelpPoints, getKelpPointsGroup} from './kelpdao';
import {getLombardPoints, getLombardPointsGroup} from './lombard';
import {getPumpPoints, getPumpPointsGroup} from './pumpbtc';
import {getRenzoPoints, getRenzoPointsGroup} from './renzo';
import {getSolvPointsGroup, getSolvPointSysAccountInfo} from './solv';
import {getSwellPoints, getSwellPointsGroup} from './swell';
import {VendorPointsGroup} from './types';
import {getUsualPoints, getUsualPointsGroup} from './usual';

type FormatPointsGroupsOptions = {
    includingZeroValues?: boolean
};

const timing = <T>(promise: Promise<T>, name: string): Promise<T> => {
    const start = Date.now();
    console.log(`[TradingBot] Start ${name}`);

    return promise
        .then(result => {
            console.log(`[TradingBot] End ${name} in ${Date.now() - start}ms`);

            return result;
        })
        .catch(error => {
            console.error(`[TradingBot] Error ${name} in ${Date.now() - start}ms`, error);
            throw error;
        });
};

const formatPoints = (points?: string | number, decimals?: number): string | undefined => {
    if (!points) {
        return;
    }

    const pointsStr = points !== undefined ? `${points}` : undefined;
    if (!decimals) {
        return points !== undefined ? Number(pointsStr).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) : undefined;
    }

    const pointsBN = BigNumber.from(pointsStr).changeDecimals(18, decimals);

    return pointsBN.noneZero() ? Number(pointsBN.toDecimal()).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) : undefined;
};

const formatPointsGroup = (pointsGroup: VendorPointsGroup, options?: FormatPointsGroupsOptions): string | undefined => {
    const points = pointsGroup.points.filter(point => options?.includingZeroValues || !!Number(point.amount));
    if (!points.length) {
        return;
    }

    const parts = [
        pointsGroup.emoji ? pointsGroup.emoji + ' ' : '',

        `${pointsGroup.name}\n`,

        points.map(point => `${point.name}: ${formatPoints(point.amount, point.decimals)}`).join('\n')
    ];

    return parts.join('');
};

const formatPointsGroupSettled = (pointsGroupSettled: PromiseSettledResult<VendorPointsGroup>, options?: FormatPointsGroupsOptions): string | undefined => {
    if (pointsGroupSettled.status === 'rejected') {
        return pointsGroupSettled.reason;
    }

    return formatPointsGroup(pointsGroupSettled.value, options);
};

const formatPointsGroupsSettled = (pointsGroupsSettled: PromiseSettledResult<VendorPointsGroup>[], options?: { includingZeroValues: boolean }): string =>
    pointsGroupsSettled.map(pointsGroup => formatPointsGroupSettled(pointsGroup, options)).filter(Boolean).join('\n\n') || 'No data found';

export const getAllVendorPointsGroups = async (walletAddress: string): Promise<PromiseSettledResult<VendorPointsGroup>[]> => {
    return Promise.allSettled([
        timing(getKelpPointsGroup(walletAddress), `getKelpPointsGroup(${walletAddress})`),
        timing(getEtherFiPointsGroup(walletAddress), `getEtherFiPointsGroup(${walletAddress})`),
        timing(getEthenaPointsGroup(walletAddress), `getEthenaPointsGroup(${walletAddress})`),
        timing(getRenzoPointsGroup(walletAddress), `getRenzoPointsGroup(${walletAddress})`),
        timing(getSolvPointsGroup(walletAddress), `getSolvPointsGroup(${walletAddress})`),
        timing(getSwellPointsGroup(walletAddress), `getSwellPointsGroup(${walletAddress})`),
        timing(getUsualPointsGroup(walletAddress), `getUsualPointsGroup(${walletAddress})`),
        timing(getLombardPointsGroup(walletAddress), `getLombardPointsGroup(${walletAddress})`),
        timing(getPumpPointsGroup(walletAddress), `getPumpPointsGroup(${walletAddress})`)
    ]);
};

export const parseWalletAddresses = (walletAddressesInput: string | string[]): string[] => {
    return [
        ...new Set(
            Array.isArray(walletAddressesInput)
                ? walletAddressesInput
                : walletAddressesInput.split(/,|，/).map(s => s.trim()).filter(Boolean)
        )
    ];
};

export const handleWalletAddresses = async <T>(
    walletAddressesInput: string | string[],
    handle: (walletAddress: string) => Promise<T>
): Promise<Record<string, T | undefined>> => {
    const walletAddresses = parseWalletAddresses(walletAddressesInput);
    if (!walletAddresses.length) {
        console.log('[TradingBot][handleWalletAddresses] Skip empty wallet addresses');

        throw new Error('Empty walletAddress');
    }

    const results: Record<string, T | undefined> = {};
    for (const walletAddress of walletAddresses) {
        results[walletAddress] = await handle(walletAddress); // fetch one by one to avoid too many requests
    }

    return results;
};

export const getAllVendorPointsGroupsInTextFormat = async (walletAddressesInput: string | string[]): Promise<string> => {
    const walletAddresses = parseWalletAddresses(walletAddressesInput);
    if (!walletAddresses.length) {
        console.log('[TradingBot][getAllVendorPointsGroupsInTextFormat] Skip empty wallet addresses');

        throw new Error('Empty walletAddress');
    }

    const results = [];
    for (const walletAddress of walletAddresses) {
        const pointsGroupsSettled = await getAllVendorPointsGroups(walletAddress); // fetch one by one to avoid too many requests
        results.push(pointsGroupsSettled);
    }

    const headText = `Total Address: ${walletAddresses.length}\n\n`;
    const bodyText = `${results.map((result, index) => `${getMaskedAddress(walletAddresses[index])}:\n${formatPointsGroupsSettled(result)}`).join('\n\n')}`;

    return headText + bodyText;
};

export const getAllVendorPointsRaw = async (walletAddress: string) => {
    const [
        etherFi,
        etherFiLRT2,
        ethenaFi,
        kelpDao,
        renzo,
        solv,
        swell,
        usual,
        lombard,
        pumpBtc
    ] = await Promise.all([
        timing(getEtherFiPortfolioV3(walletAddress), `getEtherFiPortfolioV3(${walletAddress})`),
        timing(getEtherFiLRT2(walletAddress), `getEtherFiLRT2(${walletAddress})`),
        timing(getEthenaRewards(walletAddress), `getEthenaRewards(${walletAddress})`),
        timing(getKelpPoints(walletAddress), `getKelpPoints(${walletAddress})`),
        timing(getRenzoPoints(walletAddress), `getRenzoPoints(${walletAddress})`),
        timing(getSolvPointSysAccountInfo(walletAddress), `getSolvPointSysAccountInfo(${walletAddress})`),
        timing(getSwellPoints(walletAddress), `getSwellPoints(${walletAddress})`),
        timing(getUsualPoints(walletAddress), `getUsualPoints(${walletAddress})`),
        timing(getLombardPoints(walletAddress), `getLombardPoints(${walletAddress})`),
        timing(getPumpPoints(walletAddress), `getPumpPoints(${walletAddress})`)
    ]);

    return {
        etherFi,
        etherFiLRT2,
        ethenaFi,
        kelpDao,
        renzo,
        solv,
        swell,
        usual,
        lombard,
        pumpBtc
    };
};

export const getAllVendorPoints = async (walletAddress: string) => {
    const {
        etherFi,
        etherFiLRT2,
        ethenaFi,
        kelpDao,
        renzo,
        solv,
        swell,
        usual,
        lombard,
        pumpBtc
    } = await getAllVendorPointsRaw(walletAddress);

    return {
        etherFi: etherFi.totalPointsSummaries,
        etherFiLRT2,

        ethenaFi: ethenaFi.queryWallet?.[0],

        kelpDao: {
            kelpMiles: kelpDao.value?.kelpMiles,
            kelpMilesForReferrals: kelpDao.value?.kelpMilesForReferrals
        },

        renzo: renzo.data?.totals,

        solv: {
            totalPointsEarned: solv?.totalPointsEarned
        },

        swell: {
            totalPoints: swell.points,
        },

        usual: {
            rawTotalPoints: usual.rawTotalPoints,
            currentPointsPerDay: usual.currentPointsPerDay
        },

        lombard: {
            total: lombard?.total
        },

        pumpBtc: {
            total: pumpBtc?.data?.total
        }
    };
};
