/*
 * @Author: xiaodongyu
 * @Date: 2022-11-16 15:06:44
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-18 14:38:11
 */

import {BigNumber, Contract} from 'ethers';
import {ZipFile} from 'yazl';

import abi from '@quoll/frontend/src/contract/abi/BaseRewardPool.json';

import Script from 'server/mongo/script';

import qWomConvertScript from '..';
import {bnCompare, batchProvider, columnSeparator, lineBreak, tableToMap} from '../../util';
import qWomStakeScript from '../stake';
// import qWomDepositedModel from '../deposited-model';

const daySeconds = 60 * 60 * 24;

const qWomRushPartyScript: Script = {
    meta: {
        name: 'qWomRushPartyScript',
        address: '',
        creationBlock: 0,
        abi: {},
        description: 'calculate WOM Rush winners for each stage'
    },

    crawl() {
        return qWomConvertScript.crawl();
    },

    async calculate() {
        const stageBreakpoints = [
            22733610, // blockNumber at 2022-11-03T10:00:00
            22781591, // stage 1 end, total: 1000549.643775598322539873
            22932126, // stage 2 end, blockNumber at 2022-11-10T10:00:00 
            23130292  // stage 3 end, blockNumber at 2022-11-17T10:00:00
        ];
        const multiplers = [
            5,
            2,
            1
        ];
        const winnerSumMap: {[holder: string]: [womAmount: BigNumber, quollAmount: BigNumber]} = {};

        const zip = new ZipFile();
        for (let i = 0; i < 3; i++) {
            const multipler = multiplers[i];
            const winnerMap = tableToMap(await qWomConvertScript.calculate({
                blockStart: stageBreakpoints[i] + (i > 0 ? 1 : 0),
                blockEnd: stageBreakpoints[i + 1]
            }));
            let sum = BigNumber.ZERO;
            const content = Object.entries(winnerMap).map(([holder, amount]) => {
                sum = sum.add(amount);
                const quollAmount = amount.mul(multipler);
                if (!winnerSumMap[holder]) {
                    winnerSumMap[holder] = [amount, quollAmount];
                } else {
                    const [curWom, curQuoll] = winnerSumMap[holder];
                    winnerSumMap[holder] = [amount.add(curWom), quollAmount.add(curQuoll)];
                }

                return [
                    holder,
                    amount.toString(),
                    amount.toDecimal(),
                    quollAmount.toString()
                ].join(columnSeparator);
            }).join(lineBreak);
            const sumline = [
                'sum',
                sum.toString(),
                sum.toDecimal(),
                sum.mul(multipler).toString()
            ].join(columnSeparator);
            zip.addBuffer(Buffer.from([sumline, content].join(lineBreak)), `stage-${i + 1}.csv`);
        }

        const winners = Object.keys(winnerSumMap);
        const winnerStakeMap: {[holder: string]: BigNumber} = {};
        const batchContract = new Contract(qWomStakeScript.meta.address, abi, batchProvider);
        const batchSize = 100;
        const round = Math.ceil(winners.length / batchSize);
        for (let i = 0; i < round; i++) {
            const startIdx = i * batchSize;
            await Promise.all(winners.slice(startIdx, Math.min(startIdx + batchSize, winners.length)).map(async holder => {
                winnerStakeMap[holder] = await batchContract.balanceOf(holder);
            }));
        }

        let [
            womSum,
            quollSum,
            filteredWomSum,
            filteredQuollSum
        ] = new Array(4).fill(BigNumber.ZERO);
        const sumRows = [];
        const filteredSumRows = [];
        for (const entry of Object.entries(winnerSumMap)) {
            const [holder, [womAmount, quollAmount]] = entry;
            const stakedAmount = winnerStakeMap[holder];
            const row = [
                holder,
                womAmount,
                quollAmount,
                womAmount.mul(daySeconds),
                stakedAmount
            ] as const;
            womSum = womSum.add(womAmount);
            quollSum = quollSum.add(quollAmount);
            sumRows.push(row);

            // stake > 0
            if (stakedAmount.noneZero()) {
                filteredWomSum = filteredWomSum.add(womAmount);
                filteredQuollSum = filteredQuollSum.add(quollAmount);
                filteredSumRows.push(row);
            }
        }

        sumRows.sort((a, b) => -bnCompare(a[1], b[1]));
        filteredSumRows.sort((a, b) => -bnCompare(a[1], b[1]));
        const rowToString = (rows: any) => rows.map((row: any) => row.map((col: any) => col.toString()).join(columnSeparator));
        const sumline = [
            'sum',
            womSum.toString(),
            quollSum.toString()
        ].join(columnSeparator);
        console.log(sumRows.length);
        zip.addBuffer(Buffer.from([sumline, ...rowToString(sumRows)].join(lineBreak)), 'sum.csv');
        const filteredSumline = [
            'filtered-sum',
            filteredWomSum.toString(),
            filteredQuollSum.toString()
        ].join(columnSeparator);
        console.log(filteredSumRows.length);
        zip.addBuffer(Buffer.from([filteredSumline, ...rowToString(filteredSumRows)].join(lineBreak)), 'filtered-sum.csv');

        zip.end();

        return zip.outputStream;

        /*
        const stageOneTotal = BigNumber.fromDecimal(1e6.toString());
        const logs = await qWomDepositedModel.find({
            blockNumber: {
                $gte: stageBreakpoints[0]
            }
        }).lean();
        let sum = BigNumber.ZERO;
        let stageOneEndBlock = 0;
        for (let i = 0; i < logs.length; i++) {
            const {amount, blockNumber} = logs[i];
            sum = sum.add(BigNumber.from(amount));
            if (sum.gte(stageOneTotal)) {
                console.log(blockNumber, sum.toDecimal());
                stageOneEndBlock = blockNumber;
                break;
            }
        }

        return stageOneEndBlock.toString();
        */
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default qWomRushPartyScript;
