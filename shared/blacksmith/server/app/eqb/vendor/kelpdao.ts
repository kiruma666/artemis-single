import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface GetKelpPointsResponse {
    value?: {
        kelpMiles?: string
        kelpMilesForReferrals?: string
    }
}

export const getKelpPoints = async (walletAddress: string) => {
    const response = await fetch(`https://common.kelpdao.xyz/km-el-points/user/${walletAddress}`, {
        signal: AbortSignal.timeout(5000)
    });

    return response.json() as Promise<GetKelpPointsResponse>;
};

export const getKelpPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const kelpPoints = await getKelpPoints(walletAddress);

    return {
        name: 'Kelp DAO',
        emoji: '📍',
        points: [
            {
                name: 'Rewards',
                amount: kelpPoints.value?.kelpMiles
            },
            {
                name: 'Referral Rewards',
                amount: kelpPoints.value?.kelpMilesForReferrals
            }
        ]
    };
};
