import {Application} from 'express';

import {
    getAllVendorPointsGroups,
    getAllVendorPointsGroupsInTextFormat,
    getAllVendorPointsRaw,
    getAllVendorPoints,
    handleWalletAddresses
} from '../vendor';

export function mountEqbVendorPoints(app: Application) {
    app.get('/api/eqb/vendor-points', async (req, res) => {
        const {walletAddress, format} = req.query;
        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).json({error: 'Invalid wallet address'});
        }

        try {
            let result;
            switch (format) {
                case 'bot':
                    result = `<pre>${await getAllVendorPointsGroupsInTextFormat(walletAddress)}</pre>`;
                    break;

                case 'bot-raw':
                    result = await handleWalletAddresses(walletAddress, getAllVendorPointsGroups);
                    break;

                case 'raw':
                    result = await handleWalletAddresses(walletAddress, getAllVendorPointsRaw);
                    break;

                default:
                    result = await handleWalletAddresses(walletAddress, getAllVendorPoints);
                    break;
            }

            res.send(result);
        } catch (error: any) {
            res.status(500).json({error: error?.message});
        }
    });
}
