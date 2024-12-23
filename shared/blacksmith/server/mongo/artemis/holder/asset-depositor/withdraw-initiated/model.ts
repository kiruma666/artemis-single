/**
 * @Author: sheldon
 * @Date: 2024-07-10 00:15:59
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-07-10 00:48:52
 */

import {Schema, model} from 'mongoose';

const required = true;

const artemisWithdrawInitiatedSchema = new Schema({
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
        default: 'WithdrawRequestInitiated',
    },
    user: {
        type: String,
        required
    },
    nonce: {
        type: String,
        required
    },
    artMetisAmount: {
        type: String,
        required
    },
    expectedAmount: {
        type: String,
        required
    }
});

// artemisWithdrawInitiatedSchema.index({transactionHash: 1, logIndex: 1}, {unique: true});

const ArtemisWithdrawInitiatedModel = model('artemis_withdraw_initiated_event', artemisWithdrawInitiatedSchema);

export default ArtemisWithdrawInitiatedModel;
