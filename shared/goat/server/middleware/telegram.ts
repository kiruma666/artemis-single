import {Application} from 'express';

import {getBotInfo} from 'server/bot/telegram';

export function mountTelegram(app: Application) {
    app.get('/api/telegram/verify', async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).send('Invalid walletAddress');
        }

        const botInfo = await getBotInfo();
        const verifyLink = `https://t.me/${botInfo.username}?start=${walletAddress}`;

        res.redirect(verifyLink);
    });
}
