import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface RewardInfo {
    accumulatedTotalShardsEarned?: number
}

interface getRewardsResponse {
    queryWallet?: RewardInfo[]
}

export const getEthenaRewards = async (walletAddress: string) => {
    const response = await fetch(`https://app.ethena.fi/api/rewards?address=${walletAddress}`, {
        signal: AbortSignal.timeout(5000)
    });

    return response.json() as Promise<getRewardsResponse>;
};

export const getEthenaPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const ethenaRewards = await getEthenaRewards(walletAddress);

    return {
        name: 'Ethena',
        emoji: '📍',
        points: [
            {
                name: 'Rewards collected',
                amount: ethenaRewards.queryWallet?.[0]?.accumulatedTotalShardsEarned
            }
        ]
    };
};
