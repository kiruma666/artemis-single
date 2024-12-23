/**
 * @Author: sheldon
 * @Date: 2024-05-05 22:24:16
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-05 22:33:06
 */

import {Schema, model} from 'mongoose';

const required = true;

const euclidOperatorDepositSchema = new Schema({
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
    asset: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    },
    referralId: {
        type: String
    }
});

const EuclidOperatorDepositModel = model('euclid_operator_deposit_event', euclidOperatorDepositSchema);

export default EuclidOperatorDepositModel;
