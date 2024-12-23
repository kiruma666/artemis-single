/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:34:19
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-13 01:25:12
 */

import {Schema, model, HydratedDocumentFromSchema} from 'mongoose';

import {USER_MODEL_NAME} from '../user/model';

const required = true;

export enum UserPointStatus {
    PENDING_CLAIM = 'PENDING_CLAIM',
    CLAIMED = 'CLAIMED'
}

export enum UserPointSource {
    GAME = 'GAME',
    QUEST = 'QUEST',
    REFERRAL = 'REFERRAL'
}

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
    status: {
        type: String,
        enum: Object.values(UserPointStatus),
        required
    },
    source: { // ref: https://www.notion.so/ngad/6b4e65c6f29e4717966fe697f748e28f
        type: String,
        enum: Object.values(UserPointSource),
        required
    },
    idempotentKey: {
        type: String,
        unique: true,
        required
    },
    metadata: {
        type: Schema.Types.Mixed
    },
}, {timestamps: true});

export const UserPointsModel = model('biu_user_points', UserPointsSchema);

export type UserPoints = HydratedDocumentFromSchema<typeof UserPointsSchema>;
