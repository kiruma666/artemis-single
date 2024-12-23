/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-13 15:31:48
 */

import {Schema, model} from 'mongoose';

const required = true;

const qWomDepositedModel = model('qWomDeposited', new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    user: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    }
}));

export default qWomDepositedModel;
