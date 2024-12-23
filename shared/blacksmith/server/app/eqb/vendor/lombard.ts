import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface GetLombardResponse {
    total?: number
}

export const getLombardPoints = async (walletAddress: string) => {
    const response = await fetch(`https://mainnet.prod.lombard.finance/api/v1/referral-system/season-1/points/${walletAddress}`, {
        signal: AbortSignal.timeout(5000)
    });

    return response.json() as Promise<GetLombardResponse>;
};

export const getLombardPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const lombardPoints = await getLombardPoints(walletAddress);

    return {
        name: 'Lombard',
        emoji: '📍',
        points: [
            {
                name: 'Lombard Lux',
                amount: lombardPoints.total
            }
        ]
    };
};
