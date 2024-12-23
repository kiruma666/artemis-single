import initCycleTLS from 'cycletls';

import {VendorPointsGroup} from './types';
interface GetSwellPointsResponse {
    points?: number
}

export const getSwellPoints = async (walletAddress: string) => {
    // Initiate CycleTLS
    const cycleTLS = await initCycleTLS();

    // Send request
    const response = await cycleTLS(`https://v3-lst.svc.swellnetwork.io/swell.v3.VoyageService/VoyageUser?connect=v1&encoding=json&message={"address":"${walletAddress}"}`, {
        body: '',
        ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0',
        userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0',
        timeout: 5e3
    }, 'get');

    await cycleTLS.exit();

    const parsedResponse = typeof response.body === 'string'
        ? JSON.parse(response.body)
        : response.body;

    return parsedResponse as GetSwellPointsResponse;
};

export const getSwellPointsGroup = async (walletAddress: string): Promise<VendorPointsGroup> => {
    const swellPoints = await getSwellPoints(walletAddress);

    return {
        name: 'Swell',
        emoji: '📍',
        points: [
            {
                name: 'Rewards balance',
                amount: swellPoints.points
            }
        ]
    };
};
