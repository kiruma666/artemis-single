/*
 * @Author: xiaodongyu
 * @Date: 2023-01-31 10:29:12
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-18 09:14:40
 */

import {BigNumber} from 'ethers';

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import Script from 'server/mongo/script';

import womSmartConvertorScript from '../qwom/smart-convertor';
import busdTransferScript from '../token/busd';
import daiTransferScript from '../token/dai';
import lpBusdTransferScript from '../token/lp-busd';
import lpDaiTransferScript from '../token/lp-dai';
import lpUsdcTransferScript from '../token/lp-usdc';
import lpUsdtTransferScript from '../token/lp-usdt';
import usdcTransferScript from '../token/usdc';
import usdtTransferScript from '../token/usdt';
import {lineBreak, updateGalxeCredential} from '../util';

const {log} = console;

const mainPoolAndConvertWomGalxeScript: Script = {
    meta: {
        name: 'mainPoolAndConvertWomGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async crawl() {
        await Promise.all([
            busdTransferScript.crawl(),
            lpBusdTransferScript.crawl(),
            usdcTransferScript.crawl(),
            lpUsdcTransferScript.crawl(),
            usdtTransferScript.crawl(),
            lpUsdtTransferScript.crawl(),
            daiTransferScript.crawl(),
            lpDaiTransferScript.crawl(),
            womSmartConvertorScript.crawl()
        ]);
    },

    async calculate() {
        const params = {
            blockStart: 25434906, // blockNumber at UTC 2023-02-06T15:00:00
            blockEnd: 25749691 // blockNumber at UTC 2023-02-17T16:00:00
        };

        async function updateMainPool() {
            const [
                busdDepositors,
                lpBusdDepositors,
                usdcDepositors,
                lpUsdcDepositors,
                usdtDepositors,
                lpUsdtDepositors,
                daiDepositors,
                lpDaiDepositors
            ] = await Promise.all([
                busdTransferScript.calculate(params),
                lpBusdTransferScript.calculate(params),
                usdcTransferScript.calculate(params),
                lpUsdcTransferScript.calculate(params),
                usdtTransferScript.calculate(params),
                lpUsdtTransferScript.calculate(params),
                daiTransferScript.calculate(params),
                lpDaiTransferScript.calculate(params)
            ]);
            const mainPoolDepositors: string[] = Array.from(new Set([
                ...busdDepositors,
                ...lpBusdDepositors,
                ...usdcDepositors,
                ...lpUsdcDepositors,
                ...usdtDepositors,
                ...lpUsdtDepositors,
                ...daiDepositors,
                ...lpDaiDepositors
            ]));

            log('main pool depositors:', mainPoolDepositors.length);
            await updateGalxeCredential(mainPoolDepositors, '242596086456950784');
            sendMessage(`main pool depositors updated: ${mainPoolDepositors.length}\n`);

            return mainPoolDepositors;
        }

        async function updateWomConvertor() {
            const womConvertorMap = await womSmartConvertorScript.calculate({...params, returnMap: true});
            const minConvert = BigNumber.fromDecimal('50');
            const womConvertors = Object.entries(womConvertorMap as Record<string, BigNumber>).flatMap(([user, amount]) => {
                if (amount.gte(minConvert)) return user;

                return [];
            });

            log('wom convertors:', womConvertors.length);
            await updateGalxeCredential(womConvertors, '242597135964086272');
            sendMessage(`wom convertors updated: ${womConvertors.length}`);

            return womConvertors;
        }

        const [
            mainPoolDepositors,
            womConvertors
        ] = await Promise.all([
            updateMainPool(),
            updateWomConvertor()
        ]);

        return [
            'mainPoolDepositors',
            ...mainPoolDepositors,
            'womConvertors',
            ...womConvertors
        ].join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};

export default mainPoolAndConvertWomGalxeScript;
