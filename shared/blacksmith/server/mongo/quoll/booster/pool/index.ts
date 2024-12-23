/*
 * @Author: xiaodongyu
 * @Date: 2022-12-07 17:27:53
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-07 18:59:45
 */

import {get} from '@shared/fe/server/util/request';

import Script from 'server/mongo/script';

import {columnSeparator, lineBreak} from '../../util';

import wombatBoosterPoolModel from './model';

const wombatBoosterPoolScript: Script = {
    meta: {
        name: 'wombatBoosterPool',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'pool daily apr and etc.'
    },

    async crawl() {
        const pools = await get('http://localhost:8891/api/pools');
        const doc = new wombatBoosterPoolModel({pools});
        await doc.save();
    },

    async calculate(query) {
        const {limit = 10} = query;
        const docs = await wombatBoosterPoolModel.find().sort({createdAt: -1}).limit(+limit);
        const headers = ['time'];
        const content: string[] = [];
        docs.forEach((doc, idx) => {
            const {pools, createdAt} = doc as typeof doc & {createdAt: Date};
            const poolMap = pools.reduce((map, pool) => {
                if (idx === 0) {
                    headers.push(pool.name);
                }

                map[pool.name] = pool;

                return map;
            }, {} as any);

            const row = headers.map((header, colIdx) => {
                if (colIdx === 0) {
                    return createdAt.toISOString();
                }

                return poolMap[header]?.apr ?? '/';
            }).join(columnSeparator);
            content.push(row);
        });

        return [
            headers.join(columnSeparator),
            ...content
        ].join(lineBreak);
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};

if (process.env.STAGE === 'prod') {
    // new CronJob({
    //     cronTime: '0 */4 * * *',
    //     onTick: () => wombatBoosterPoolScript.crawl(),
    //     start: true
    // });

    // console.log('wombatBoosterPoolScript crawl started');
}

export default wombatBoosterPoolScript;
