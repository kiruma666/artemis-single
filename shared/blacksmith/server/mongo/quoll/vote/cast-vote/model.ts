/*
 * @Author: kaiwang 
 * @Date: 2023-02-13 14:37:08 
 * @Last Modified by: kaiwang
 * @Last Modified time: 2023-02-13 15:18:49
 */

import {Schema, model} from 'mongoose';

const required = true;

const schema = new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    logIndex: {
        type: Number,
        required
    },
    event: {
        type: String,
        default: '',
    }
});

const bribeManagerCastVoteModel = model('bribeManagerCastVote', schema);

schema.index({transactionHash: 1, logIndex: 1}, {unique: true});

export default bribeManagerCastVoteModel;
