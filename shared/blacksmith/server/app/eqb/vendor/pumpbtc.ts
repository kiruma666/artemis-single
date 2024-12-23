import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface PointDetail {
    name: string
    point: string
}

interface WalletData {
    total: string
    details: PointDetail[]
}

interface GetPumpBtcResponse {
    code: number
    msg: string
    data: {
        [walletAddress: string]: WalletData
    }
}

export const getPumpPoints = async (walletAddress: string) => {
    const response = await fetch(`https://api.pumpbtc.xyz/api/user/point?user_addr=${walletAddress}`, {
        signal: AbortSignal.timeout(5000),
        headers: {
            'x-api-key': 'gXNi9495ycrn6ee8D5a4okUfeACd1DBj2061NX0GS552IRJOTl440QaM4VCp0aDL'
        }
    });

    return response.json() as Promise<GetPumpBtcResponse>;
};

export const getPumpPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const pumpPoints = await getPumpPoints(walletAddress);

    return {
        name: 'PumbBtc',
        emoji: '📍',
        points: [
            {
                name: 'Pump Points',
                amount: pumpPoints?.data[walletAddress]?.total ?? '0'
            }
        ]
    };
};
