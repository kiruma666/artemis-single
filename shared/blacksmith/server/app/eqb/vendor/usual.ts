import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface GetUsualPointsResponse {
    rawTotalPoints?: string
    currentPointsPerDay?: string
}

export const getUsualPoints = async (walletAddress: string) => {
    const response = await fetch(`https://app.usual.money/api/points/${walletAddress}`, {
        signal: AbortSignal.timeout(5000)
    });

    return response.json() as Promise<GetUsualPointsResponse>;
};

export const getUsualPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const usualPoints = await getUsualPoints(walletAddress);

    return {
        name: 'Usual',
        emoji: '📍',
        points: [
            {
                name: 'Total pills',
                amount: usualPoints.rawTotalPoints,
                decimals: 18
            }
        ]
    };
};
