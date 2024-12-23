/**
 * @Author: sheldon
 * @Date: 2023-11-14 23:41:46
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-28 15:54:55
 */

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import {lineBreak, updateGalxeCredential} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {arbEPendleVault} from './e-pendle-vault/script';
import {SmartConvertorScript} from './smart-convertor/script';

const {log} = console;

export const PENDLEPaloozaGalxeScript: Script = {
    meta: {
        name: 'PENDLEPaloozaGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async crawl() {
        await Promise.all([
            SmartConvertorScript.crawl(),
            arbEPendleVault.crawl()
        ]);
    },

    async calculate() {
        const depositorsList = await Promise.all([
            SmartConvertorScript.calculate({
                blockStart: 18568210, // blockNumber at UTC+8 2023-11-14 14:00:00
                blockEnd: 18668199 // blockNumber at UTC+8 2023-11-28 14:00:00 PENDLEPalooza end
            }),
            arbEPendleVault.calculate({
                blockStart: 150233183, // blockNumber at UTC+8 2023-11-14 14:00:00
                blockEnd: 154818241 // blockNumber at UTC+8 2023-11-28 14:00:00 PENDLEPalooza end
            })
        ]);
        const depositors: string[] = Array.from(new Set(depositorsList.flat(1)));

        log('PENDLE Palooza convertors:', depositors.length);
        await updateGalxeCredential(depositors, '346825100888809472', 's6KC3v2viQ5ScIgfwTKIArgFGJUyynna');
        sendMessage(`PENDLE Palooza convertors updated: ${depositors.length}`);

        return depositors.join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};
