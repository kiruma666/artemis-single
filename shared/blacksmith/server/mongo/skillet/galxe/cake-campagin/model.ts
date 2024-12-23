/**
 * @Author: sheldon
 * @Date: 2023-10-29 00:00:28
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-11 16:38:38
 */

import {Schema, model} from 'mongoose';

const required = true;

export default model('skilletCakeCampaignModel', new Schema({
    address: {
        type: String,
        required
    },
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
    }
}));
