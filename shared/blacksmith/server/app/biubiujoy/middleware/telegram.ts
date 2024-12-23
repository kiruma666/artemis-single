import {Application} from 'express';

import startTelegramBot, {getBotInfo} from '../bot/telegram';

export function mountBiuTelegram(app: Application) {
    startTelegramBot();

    app.get('/api/biu/telegram/verify', async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).json({error: 'Invalid walletAddress'});
        }

        const botInfo = await getBotInfo();
        const verifyLink = `https://t.me/${botInfo.username}?start=${walletAddress}`;

        res.redirect(verifyLink);
    });
}
