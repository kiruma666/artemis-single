import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface TotalPointsSummary {
    TotalPoints?: number
    CurrentPoints?: number
    PreviousHistoricalPoints?: number
}

interface GetPortfolioV3Response {
    totalPointsSummaries?: Record<string, TotalPointsSummary | undefined>
}

export const getEtherFiPortfolioV3 = async (walletAddress: string) => {
    const response = await fetch(`https://app.ether.fi/api/portfolio/v3/${walletAddress}`, {
        signal: AbortSignal.timeout(8000)
    });

    return response.json() as Promise<GetPortfolioV3Response>;
};

interface GetEtherFiLRT2Response {
    Amount?: string
}

export const getEtherFiLRT2 = async (walletAddress: string) => {
    const response = await fetch(`https://app.ether.fi/api/lrt2/${walletAddress}`, {
        signal: AbortSignal.timeout(8000)
    });

    return response.json() as Promise<GetEtherFiLRT2Response>;
};

export const getEtherFiPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const [
        etherFi,
        etherFiLRT2
    ] = await Promise.all([
        getEtherFiPortfolioV3(walletAddress),
        getEtherFiLRT2(walletAddress)
    ]);

    return {
        name: 'Ether.fi',
        emoji: '📍',
        points: [
            {
                name: 'LRT² Restaking Rewards',
                amount: etherFiLRT2.Amount,
                decimals: 18
            },
            {
                name: 'Total Current Season Points',
                amount: etherFi.totalPointsSummaries?.LOYALTY?.CurrentPoints,
            },
            {
                name: 'Previous Seasons Points',
                amount: etherFi.totalPointsSummaries?.LOYALTY?.PreviousHistoricalPoints
            },
            {
                name: 'All Time Loyalty Points',
                amount: etherFi.totalPointsSummaries?.LOYALTY?.TotalPoints
            }
        ]
    };
};
