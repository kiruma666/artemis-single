/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:27:51
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-08-03 15:36:35
 */

import {Schema, model} from 'mongoose';

const required = true;

const artemisLiquiditySwapSchema = new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    transactionFrom: {
        type: String,
        default: ''
    },
    event: {
        type: String,
        default: '',
    },
    sender: {
        type: String,
        required
    },
    recipient: {
        type: String,
        required
    },
    amount0: {
        type: String,
        required
    },
    amount1: {
        type: String,
        required
    },
    price: {
        type: String,
        required
    },
    liquidity: {
        type: String,
        required
    },
    tick: {
        type: String,
        required
    }
});

const ArtemisLiquiditySwapModel = model('artemis_liquidity_swap_event', artemisLiquiditySwapSchema);

export default ArtemisLiquiditySwapModel;
