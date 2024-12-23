import fetch from 'isomorphic-fetch';

import {VendorPointsGroup} from './types';

interface TotalPointsSummary {
    renzoPoints?: number
    eigenLayerPoints?: number
    mellowPoints?: number
    symbioticPoints?: number
}

interface GetRenzoPointsResponse {
    success?: boolean
    data?: {
        totals?: TotalPointsSummary
    }
}

export const getRenzoPoints = async (walletAddress: string) => {
    const response = await fetch(`https://app.renzoprotocol.com/api/points/${walletAddress}`, {
        signal: AbortSignal.timeout(5000)
    });

    return response.json() as Promise<GetRenzoPointsResponse>;
};

export const getRenzoPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const renzoPoints = await getRenzoPoints(walletAddress);

    return {
        name: 'Renzo',
        emoji: '📍',
        points: [
            {
                name: 'EigenLayer Points',
                amount: renzoPoints.data?.totals?.eigenLayerPoints
            },
            {
                name: 'ezPoints',
                amount: renzoPoints.data?.totals?.renzoPoints
            },
            {
                name: 'Symbiotic Points',
                amount: renzoPoints.data?.totals?.symbioticPoints
            },
            {
                name: 'Mellow Points',
                amount: renzoPoints.data?.totals?.mellowPoints
            }
        ]
    };
};
