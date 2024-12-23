/*
 * @Author: xiaodongyu
 * @Date: 2022-11-03 16:11:13
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-01-19 12:28:14
 */

import {BigNumber} from 'ethers';

import Script from 'server/mongo/script';

import qWomConvertScript from '..';
import {lineBreak, tableToMap, updateGalxeCredential} from '../../util';
import qWomStakeScript from '../stake';

const {log} = console;

const qWomRushPartyGalxeScript: Script = {
    meta: {
        name: 'qWomRushPartyGalxeScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate who can participate in Galxe compaign and populate Galxe Credential'
    },

    async crawl() {
        await Promise.all([
            qWomConvertScript.crawl(),
            qWomStakeScript.crawl()
        ]);
    },

    async calculate() {
        const params = {
            blockStart: 22733610, // blockNumber at 2022-11-03T10:00:00
            blockEnd: 23130292 // blockNumber at 2022-11-17T10:00:00
        };

        const [
            convertMap,
            stakeMap
        ] = (await Promise.all([
            qWomConvertScript.calculate(params),
            qWomStakeScript.calculate(params)
        ])).map(tableToMap);
        const holders: string[] = [];
        const minAmount = BigNumber.fromDecimal('100');
        Object.entries(convertMap).forEach(([user, convertAmount]) => {
            const stakeAmount = stakeMap[user];
            if (convertAmount.gte(minAmount) && stakeAmount?.gte(minAmount)) {
                holders.push(user);
            }
        });

        log('Rush Party holders:', holders.length);
        await updateGalxeCredential(holders, '210310040621064192');

        return holders.join(lineBreak);
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default qWomRushPartyGalxeScript;
