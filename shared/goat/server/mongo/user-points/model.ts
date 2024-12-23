/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:34:19
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-13 01:25:12
 */

import {Schema, model, HydratedDocumentFromSchema} from 'mongoose';

import {USER_MODEL_NAME} from '../user/model';

const required = true;

const UserPointsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: USER_MODEL_NAME,
        required
    },
    points: {
        type: String,
        required
    },
    source: {
        type: String,
        enum: [
            'INVITE',
            'WHITELIST',
            'LOCK'
        ],
        required
    },
    idempotentKey: {
        type: String,
        unique: true,
        required
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {timestamps: true});

export const UserPointsModel = model('user_points', UserPointsSchema);

export type UserPoints = HydratedDocumentFromSchema<typeof UserPointsSchema>;
