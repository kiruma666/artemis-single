/**
 * @Author: sheldon
 * @Date: 2023-11-14 23:05:54
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-15 00:22:02
 */

import {Schema, model} from 'mongoose';

const required = true;

const eqbEPendleVaultModel = model('eqbEPendleVault', new Schema({
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

export default eqbEPendleVaultModel;
