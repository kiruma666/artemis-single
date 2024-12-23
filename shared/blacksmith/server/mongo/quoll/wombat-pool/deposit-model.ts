/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-17 11:12:02
 */

import {Schema, model} from 'mongoose';

const required = true;

const wombatDepositModel = model('wombatDeposit', new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    event: {
        type: String,
        default: '',
    },
    user: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    },
    pid: {
        type: Number,
        required
    }
}));

export default wombatDepositModel;
