
import {Application, json} from 'express';

import {INTERNAL_API_PATH_PREFIX} from 'server/util/constant';

import {findUserByWalletAddressIgnoreCase} from '../user/model';

import {UserInviteCodeModel} from './model';

export function mountBiuUserInviteCode(app: Application) {
    const apiPath = '/api/biu/user-invite-code';

    app.get(`${INTERNAL_API_PATH_PREFIX}${apiPath}`, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress as string);
            if (!user) {
                return res.status(400).json({error: 'user not found'});
            }

            const list = await UserInviteCodeModel.find({userId: user._id}).sort({updatedAt: -1}).lean();
            res.json({
                total: list.length,
                list
            });
        } catch (err) {
            console.error('[UserInviteCode][Get] failed', err);
            res.status(500).json({error: 'Error getting user inviteCode'});
        }
    });

    app.post(`${INTERNAL_API_PATH_PREFIX}${apiPath}`, json(), async (req, res) => {
        const {walletAddress, inviteCode: customizedInviteCode} = req.body;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        if (!customizedInviteCode?.trim()) {
            return res.status(400).json({error: 'inviteCode is required'});
        }

        const inviteCode = customizedInviteCode.trim();

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress);
            if (!user) {
                return res.status(400).json({error: 'user not found'});
            }

            if (await UserInviteCodeModel.exists({userId: {$ne: user._id}, inviteCode})) {
                return res.status(400).json({error: 'inviteCode already exists'});
            }

            await UserInviteCodeModel.updateOne({userId: user._id, inviteCode}, {userId: user._id, inviteCode}, {upsert: true});

            res.json({success: true});
        } catch (err) {
            console.error('[UserInviteCode][Create] failed', err);
            res.status(500).json({error: 'Error creating user inviteCode'});
        }
    });
}
