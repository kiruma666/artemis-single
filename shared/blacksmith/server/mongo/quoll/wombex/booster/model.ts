/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-10-26 14:45:07
 */

import {Schema, model} from 'mongoose';

const required = true;

const wombexBoosterModel = model('wombexBooster', new Schema({
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
    poolid: {
        type: Number,
        required
    },
    amount: {
        type: String,
        required
    }
}));

export default wombexBoosterModel;
