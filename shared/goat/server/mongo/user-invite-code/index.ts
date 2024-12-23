
import {Application} from 'express';

import {INTERNAL_API_PATH_PREFIX} from 'server/util/constant';

import {findUserByWalletAddress} from '../user/model';

import {UserInviteCodeModel} from './model';

export function mountUserInviteCode(app: Application) {
    const apiPath = '/api/user-invite-code';

    app.get(`${INTERNAL_API_PATH_PREFIX}${apiPath}`, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            const user = await findUserByWalletAddress(walletAddress as string);
            if (!user) {
                return res.status(400).send('user not found');
            }

            const list = await UserInviteCodeModel.find({userId: user._id}).sort({updatedAt: -1}).lean();
            res.json({
                total: list.length,
                list
            });
        } catch (err) {
            console.error('[UserInviteCode][Get] failed', err);
            res.status(500).send('Error getting user inviteCode');
        }
    });

    app.post(`${INTERNAL_API_PATH_PREFIX}${apiPath}`, async (req, res) => {
        const {walletAddress, inviteCode: customizedInviteCode} = req.body;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        if (!customizedInviteCode?.trim()) {
            return res.status(400).send('inviteCode is required');
        }

        const inviteCode = customizedInviteCode.trim();

        try {
            const user = await findUserByWalletAddress(walletAddress);
            if (!user) {
                return res.status(400).send('user not found');
            }

            if (await UserInviteCodeModel.exists({userId: {$ne: user._id}, inviteCode})) {
                return res.status(400).send('inviteCode already exists');
            }

            await UserInviteCodeModel.updateOne({userId: user._id, inviteCode}, {userId: user._id, inviteCode}, {upsert: true});

            res.json({success: true});
        } catch (err) {
            console.error('[UserInviteCode][Create] failed', err);
            res.status(500).send('Error creating user inviteCode');
        }
    });
}
