/**
 * @Author: sheldon
 * @Date: 2023-10-29 00:16:48
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-02 22:21:49
 */

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import {lineBreak, updateGalxeCredential} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {campaignScript0, campaignScript1, campaignScript2} from './contract-script';

const {log} = console;
const campaignScripts = [campaignScript0, campaignScript1, campaignScript2];

export const skilletCakeCampaignGalxeScript: Script = {
    meta: {
        name: 'skilletCakeCampaignGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async crawl() {
        await Promise.all(campaignScripts.map(script => script.crawl()));
    },

    async calculate() {
        const params = {
            blockStart: 33363163, // cakeCampaign-0 creation block
            blockEnd: 34363163 // TODO blockNumber at Dec 11th UTC 6AM (when last campaign ends)
        };

        const depositorsList = await Promise.all(campaignScripts.map(script => script.calculate(params)));
        const depositors: string[] = Array.from(new Set(depositorsList.flat()));

        log('[skillet] CAKE Campaign depositors:', depositors.length);
        await updateGalxeCredential(depositors, '345776884479074304', 's6KC3v2viQ5ScIgfwTKIArgFGJUyynna');
        sendMessage(`[skillet] CAKE Campaign depositors updated: ${depositors.length}`);

        return depositors.join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};
