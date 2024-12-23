/**
 * @Author: sheldon
 * @Date: 2024-06-22 17:39:44
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-22 17:51:28
 */

import {Schema, model} from 'mongoose';

const required = true;

const euclidAssetWithdrawalSchema = new Schema({
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
    elETHUnstaked: {
        type: String,
        required
    }
});

// euclidAssetDepositorSchema.index({transactionHash: 1, logIndex: 1}, {unique: true});

const EuclidAssetWithdrawalModel = model('euclid_asset_withdrawal_event', euclidAssetWithdrawalSchema);

export default EuclidAssetWithdrawalModel;
