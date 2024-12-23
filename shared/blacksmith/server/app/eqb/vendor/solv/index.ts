import {GraphQLClient} from 'graphql-request';

import {VendorPointsGroup} from '../types';

import GetPointSysAccountInfoQuery from './GetPointSysAccountInfo.graphql';

type GetPointSysAccountInfoQueryResponse = {
    pointSysAccountInfo?: {
        totalPointsEarned?: string
    }
};

export const getSolvPointSysAccountInfo = async (address: string) => {
    const client = new GraphQLClient('https://sft-api.com/graphql', {
        headers: {
            authorization: `Bearer ${process.env.SFT_API_TOKEN}`
        },
        signal: AbortSignal.timeout(5000)
    });

    const data: GetPointSysAccountInfoQueryResponse = await client.request(GetPointSysAccountInfoQuery, {address});

    return data.pointSysAccountInfo;
};

export const getSolvPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const pointSysAccountInfo = await getSolvPointSysAccountInfo(walletAddress);

    return {
        name: 'Solv',
        emoji: '📍',
        points: [
            {
                name: 'Total XP',
                amount: pointSysAccountInfo?.totalPointsEarned
            }
        ]
    };
};
