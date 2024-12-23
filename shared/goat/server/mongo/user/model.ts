/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:34:19
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-06 23:38:10
 */

import {Api} from 'grammy';
import {HydratedDocumentFromSchema, Schema, model} from 'mongoose';

import {getUrlByS3Key} from '@shared/fe/server/util/aws-s3';
import {generateProfileImage} from '@shared/fe/server/util/blockie';
import {getMaskedAddress} from '@shared/fe/util/address';

import {WEBSITE_ORIGIN} from 'server/util/constant';

const required = true;

type ChatMember = Awaited<ReturnType<Api['getChatMember']>>;

export const EligibleTelegramStatus: Array<ChatMember['status']> = ['member', 'administrator', 'creator'];

const AllTelegramStatus: Array<ChatMember['status']> = ['member', 'administrator', 'creator', 'restricted', 'left', 'kicked'];

export const USER_MODEL_NAME = 'user';

const UserSchema = new Schema({
    walletAddress: {
        type: String,
        unique: true,
        required
    },
    invitedBy: { // inviteCode of the inviter
        type: String
    },
    twitter: {
        userId: String,
        username: String,
        following: Boolean,
    },
    telegram: {
        userId: String,
        username: String,
        status: {
            type: String,
            enum: AllTelegramStatus
        },
        is_member: Boolean
    },
    nickname: String,
    profileImageS3Key: String,
}, {timestamps: true});

export const UserModel = model('user', UserSchema);

export type User = HydratedDocumentFromSchema<typeof UserSchema>;

export const isTwitterFollowing = (user: User): boolean => !!user.twitter?.following;

export const isTelegramGroupJoined = (userOrChatMember?: User | ChatMember): boolean => {
    if (!userOrChatMember) {
        return false;
    }

    const info = ('status' in userOrChatMember && 'user' in userOrChatMember)
        ? userOrChatMember // ChatMember
        : userOrChatMember.telegram; // User

    if (info?.status === 'restricted') {
        return info.is_member ?? false;
    }

    return !!info?.status && EligibleTelegramStatus.includes(info.status);
};

export const isEligibleForWhitelist = (user: User): boolean => isTwitterFollowing(user) && isTelegramGroupJoined(user);

const getProfileImage = (user: User) => user.profileImageS3Key ? getUrlByS3Key(user.profileImageS3Key) : generateProfileImage(user.walletAddress);

export const pickAndDeriveUserFields = (user: User, inviteCode: string) => {
    const {
        walletAddress,
        invitedBy,
        nickname,
        createdAt
    } = user;

    return {
        walletAddress,
        inviteCode,
        invitedBy,
        inviteLink: WEBSITE_ORIGIN && `${WEBSITE_ORIGIN}/log-in?inviteCode=${inviteCode}`,
        isTwitterFollowing: isTwitterFollowing(user),
        isTelegramGroupJoined: isTelegramGroupJoined(user),
        isEligibleForWhitelist: isEligibleForWhitelist(user),
        createdAt,
        nickname,
        profileImage: getProfileImage(user)
    };
};

export const pickPublicUserFields = (user: User) => {
    const {
        walletAddress,
        nickname,
        createdAt
    } = user;

    return {
        maskedAddress: getMaskedAddress(walletAddress),
        nickname,
        profileImage: getProfileImage(user),
        createdAt
    };
};

export const findUserByWalletAddress = async (walletAddress?: string) => {
    console.log(`[User] findUserByWalletAddress: walletAddress=${walletAddress}`);
    const user = await UserModel.findOne({walletAddress});
    console.log(`[User] findUserByWalletAddress: walletAddress=${walletAddress}, got user=`, user);

    return user;
};

export const findUserByTelegramUserId = async (teleUserId: string) => {
    console.log(`[User] findUserByTelegramUserId: teleUserId=${teleUserId}`);
    const user = await UserModel.findOne({'telegram.userId': teleUserId});
    console.log(`[User] findUserByTelegramUserId: teleUserId=${teleUserId}, got user=`, user);

    return user;
};

export const findPendingTelegramUsers = async (createdAfter?: Date) => {
    console.log('[User] findPendingTelegramUsers');

    const users = await UserModel.find({
        'telegram.userId': {$exists: true, $ne: null},
        'telegram.status': {$nin: EligibleTelegramStatus},
        'telegram.is_member': {$ne: true},
        ...createdAfter && {createdAt: {$gte: createdAfter}}
    });

    console.log('[User] findPendingTelegramUsers, found', users?.length ?? 0, {teleUserIds: users.map(({telegram}) => telegram?.userId)});

    return users;
};
