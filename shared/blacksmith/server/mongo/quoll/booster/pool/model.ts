/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-07 17:42:07
 */

import {Schema, model} from 'mongoose';

const required = true;

const wombatBoosterPoolModel = model('wombatBoosterPoolData', new Schema({
    pools: {
        type: [{
            pid: {
                type: Number,
                required
            },
            name: {
                type: String,
                required
            },
            tvl: {
                type: String,
                required
            },
            apr: {
                type: Number,
                required
            }
        }],
        required
    }
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false
    }
}));

export default wombatBoosterPoolModel;
