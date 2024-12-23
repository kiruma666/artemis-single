/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:34:19
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-06 23:38:10
 */

import {HydratedDocumentFromSchema, Schema, model} from 'mongoose';

import {USER_MODEL_NAME} from '../user/model';

const required = true;

const UserInviteCodeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: USER_MODEL_NAME,
        required
    },
    inviteCode: { // one user can have multiple invite codes
        type: String,
        unique: true,
        required
    }
}, {timestamps: true});

export const UserInviteCodeModel = model('user_invite_code', UserInviteCodeSchema);

export type UserInviteCode = HydratedDocumentFromSchema<typeof UserInviteCodeSchema>;
