/*
 * @Author: xiaodongyu
 * @Date: 2023-01-19 13:25:55
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-01-19 23:45:58
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import {getBlockRangeFilter, tokenSelf} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const hayModel = model('hayTransfer', tokenSchema);
const hayTransferScript = createToken({
    name: 'hayTransferScript',
    address: '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
    creationBlock: 20324776,
    description: 'hay token'
}, hayModel);

hayTransferScript.calculate = async args => {
    const logs = await hayModel.find(getBlockRangeFilter(args)).lean();
    const twenty = BigNumber.fromDecimal('20');
    const depositorMap: Record<string, BigNumber> = {};
    logs.forEach(({from, to, value}: any) => {
        if (from !== tokenSelf && to === AddressMap['56'].zap) {
            if (!depositorMap[from]) {
                depositorMap[from] = BigNumber.from(value);
            } else {
                depositorMap[from] = depositorMap[from].add(value);
            }
        }
    });

    const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(twenty) ? userAccount : []);

    log('At least 20 HAY depositors count:', validDepositors.length);

    return validDepositors;
};

export default hayTransferScript;
