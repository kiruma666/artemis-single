/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-04-08 20:55:01
 */

import {Schema, model} from 'mongoose';

const required = true;

export const ArbiWomDepositorDepositedModel = model('ArbiWomDepositorDeposited', new Schema({
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
    },
    contract: {
        type: String,
        default: ''
    }
}));
