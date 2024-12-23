/*
 * @Author: xiaodongyu
 * @Date: 2023-01-19 13:25:55
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-01 11:43:43
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import {getBlockRangeFilter, tokenSelf, voterProxyAddress} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const lpHayModel = model('lpHayTransfer', tokenSchema);
const lpHayTransferScript = createToken({
    name: 'lpHayTransferScript',
    address: '0x1fa71DF4b344ffa5755726Ea7a9a56fbbEe0D38b',
    creationBlock: 21370897,
    description: 'lp-hay token'
}, lpHayModel);

lpHayTransferScript.calculate = async args => {
    const logs = await lpHayModel.find(getBlockRangeFilter(args)).lean();
    const twenty = BigNumber.fromDecimal('20');
    const depositorMap: Record<string, BigNumber> = {};
    logs.forEach(({from, to, value}: any) => {
        if (from !== tokenSelf && to === voterProxyAddress) {
            if (!depositorMap[from]) {
                depositorMap[from] = BigNumber.from(value);
            } else {
                depositorMap[from] = depositorMap[from].add(value);
            }
        }
    });

    const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(twenty) ? userAccount : []);

    log('At least 20 LP-HAY depositors count:', validDepositors.length);

    return validDepositors;
};

export default lpHayTransferScript;
