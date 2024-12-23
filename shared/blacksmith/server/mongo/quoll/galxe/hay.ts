/*
 * @Author: xiaodongyu
 * @Date: 2023-01-19 14:04:18
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-07 10:26:32
 */

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import Script from 'server/mongo/script';

import hayTransferScript from '../token/hay';
import lpHayTransferScript from '../token/lp-hay';
import {lineBreak, updateGalxeCredential} from '../util';

const {log} = console;

const hayGalxeScript: Script = {
    meta: {
        name: 'hayGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async crawl() {
        await Promise.all([
            hayTransferScript.crawl(),
            lpHayTransferScript.crawl()
        ]);
    },

    async calculate() {
        const params = {
            blockStart: 24888964, // blockNumber at UTC+8 2023-01-18 17:00:00
            blockEnd: 25445595 // blockNumber at UTC 2023-02-07T00:00:00
        };

        const [
            hayDepositors,
            lpHayDepositors
        ] = await Promise.all([
            hayTransferScript.calculate(params),
            lpHayTransferScript.calculate(params)
        ]);
        const depositors: string[] = Array.from(new Set([...hayDepositors, ...lpHayDepositors]));

        log('HAY and LP-HAY depositors:', depositors.length);
        await updateGalxeCredential(depositors, '238618431474802688');
        sendMessage(`HAY depositors updated: ${depositors.length}`);

        return depositors.join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};

export default hayGalxeScript;
