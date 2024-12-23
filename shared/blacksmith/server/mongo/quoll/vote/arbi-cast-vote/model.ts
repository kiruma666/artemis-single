/*
 * @Author: kaiwang 
 * @Date: 2023-04-12 11:03:25 
 * @Last Modified by:   kaiwang 
 * @Last Modified time: 2023-04-12 11:03:25 
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

const arbiBribeManagerCastVoteModel = model('arbiBribeManagerCastVote', schema);

schema.index({transactionHash: 1, logIndex: 1}, {unique: true});

export default arbiBribeManagerCastVoteModel;
