/**
 * @Author: sheldon
 * @Date: 2023-10-29 00:16:48
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-16 22:27:27
 */

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import {lineBreak, updateGalxeCredential} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {swETHRewardPoolScript1, swETHRewardPoolScript2} from './base-reward-pool';

const {log} = console;
const scripts = [
    swETHRewardPoolScript1,
    swETHRewardPoolScript2
];

export const swETHEqbGalxeScript: Script = {
    meta: {
        name: 'swETHBoostedPoolGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async fixData(params) {
        await Promise.all(scripts.map(script => script.fixData?.(params)));
    },

    async crawl() {
        await Promise.all(scripts.map(script => script.crawl()));
    },

    async calculate() {
        const params = {
            blockStart: 18483373, // blockNumber at UTC+8 2023-11-02 17:00:00
            blockEnd: 18583412 // blockNumber at UTC+8 2023-11-16 17:00:00
        };

        const depositorsList = await Promise.all(scripts.map(script => script.calculate(params)));
        const depositors: string[] = Array.from(new Set(depositorsList.flat()));

        log('swETH depositors:', depositors.length);
        await updateGalxeCredential(depositors, '340147577857679360', 's6KC3v2viQ5ScIgfwTKIArgFGJUyynna');
        sendMessage(`swETH depositors updated: ${depositors.length}`);

        return depositors.join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};
