import {Bot, Context} from 'grammy';

import {getMaskedAddress} from '@shared/fe/util/address';
import {catchAsync} from '@shared/fe/util/async';

import {
    STAGE,
    BIU_TELE_TOKEN,
    BIU_TELE_GROUP_ID,
    BIU_TELE_GROUP_INVITE_LINK,
    BIU_TELE_USER_PENDING_SECONDS,
    BIU_WEB_ORIGIN
} from 'server/util/constant';

import {findPendingTelegramUsers, findUserByTelegramUserId, findUserByWalletAddressIgnoreCase, isTelegramGroupJoined} from '../mongo/user/model';
import {syncUserPoints} from '../mongo/user-points/service';

const commands = {
    start: 'start',
    verify: 'verify',
};

let bot: Bot<Context> | undefined;

const getWelcomeMessage = () =>
    `Welcome to the Biubiujoy! First, join our official group, then return here to check your verification status. Please click the link below to join the official group.
${BIU_TELE_GROUP_INVITE_LINK}`;

const getVerifiedMessage = (walletAddress: string) => `This wallet address ${getMaskedAddress(walletAddress)} has already been verified.`;

const getVerifiedMismatchedMessage = (walletAddress: string) => `Welcome to the Biubiujoy! Your account has been verified by this wallet address: ${getMaskedAddress(walletAddress)}`;

const getVerifiedSuccessMessage = (walletAddress: string) => `This wallet address ${getMaskedAddress(walletAddress)} has been verified successfully!`;

const getNoWalletAddressMessage = () => 'Please enter your wallet address to verify.';

const getNoUserMessage = () => `Please register on our website first.
${BIU_WEB_ORIGIN}`;

async function findGroupMember(teleUserId?: any) {
    console.log(`[Telegram][getChatMember] teleUserId=${teleUserId}, groupId=${BIU_TELE_GROUP_ID}`);

    if (!bot) {
        throw new Error('[Telegram][getChatMember] Bot not initialized');
    }

    if (!BIU_TELE_GROUP_ID) {
        throw new Error('[Telegram][getChatMember] Missing groupId');
    }

    if (!teleUserId) {
        console.log('[Telegram][getChatMember] Skip empty userId');

        return;
    }

    const member = await bot.api.getChatMember(BIU_TELE_GROUP_ID, Number(teleUserId));
    const isMember = isTelegramGroupJoined(member);
    console.log(`[Telegram][getChatMember] teleUserId=${teleUserId}, groupId=${BIU_TELE_GROUP_ID}, isMember=${isMember}`, member);

    return member;
}

export enum VerifyResult {
    WELCOME = 'WELCOME',
    SUCCESS = 'SUCCESS',
    ALREADY_VERIFIED = 'ALREADY_VERIFIED',
    ALREADY_VERIFIED_WALLET_MISMATCHED = 'ALREADY_VERIFIED_WALLET_MISMATCHED',
    ALREADY_VERIFIED_TELEGRAM_USER_MISMATCHED = 'ALREADY_VERIFIED_TELEGRAM_USER_MISMATCHED',
    NO_WALLET_ADDRESS = 'NO_WALLET_ADDRESS',
    NO_USER = 'NO_USER',
}

// TODO(pancake) limit rate or verify human
async function verify({
    teleUserId,
    teleUsername,
    walletAddress
}: {
    teleUserId: string
    teleUsername?: string
    walletAddress?: string
}): Promise<VerifyResult> {
    const [
        userByTeleUserId,
        userByWalletAddress,
        member
    ] = await Promise.all([
        findUserByTelegramUserId(teleUserId),
        findUserByWalletAddressIgnoreCase(walletAddress),
        findGroupMember(teleUserId)
    ]);

    const user = userByTeleUserId || userByWalletAddress;
    if (user) {
        if (isTelegramGroupJoined(user)) {
            if (!userByTeleUserId && userByWalletAddress) {
                return VerifyResult.ALREADY_VERIFIED_TELEGRAM_USER_MISMATCHED;
            }

            return walletAddress && user.walletAddress != walletAddress
                ? VerifyResult.ALREADY_VERIFIED_WALLET_MISMATCHED
                : VerifyResult.ALREADY_VERIFIED;
        }

        // Save the user's telegram info for later verification
        user.telegram = {
            userId: teleUserId,
            username: teleUsername,
            status: member?.status,
            is_member: member?.status === 'restricted' ? member?.is_member : undefined
        };
        console.log(`[Telegram][Verify] Save telegram info of ${user.walletAddress}`, user.telegram);
        await user.save();

        if (isTelegramGroupJoined(member)) {
            return VerifyResult.SUCCESS;
        }

        return VerifyResult.WELCOME;
    }

    // no wallet address in param
    if (!walletAddress) {
        return VerifyResult.NO_WALLET_ADDRESS;
    }

    // wallet address not exist in db
    return VerifyResult.NO_USER;
}

async function notify({
    teleUserId,
    verifyResult,
    allowedResults
}: {
    teleUserId: string
    verifyResult: VerifyResult
    allowedResults?: VerifyResult[]
}) {
    if (!bot) {
        throw new Error('[Telegram][Notify] Bot not initialized');
    }

    if (allowedResults?.length && !allowedResults.includes(verifyResult)) {
        console.log('[Telegram][Notify] Skip not allowed result', verifyResult);

        return;
    }

    const user = await findUserByTelegramUserId(teleUserId);

    switch (verifyResult) {
        case VerifyResult.WELCOME:
            await bot.api.sendMessage(teleUserId, getWelcomeMessage());
            break;

        case VerifyResult.SUCCESS:
            if (!user?.walletAddress) {
                throw new Error('[Telegram][Notify] Missing wallet address');
            }

            await bot.api.sendMessage(teleUserId, getVerifiedSuccessMessage(user.walletAddress));
            break;

        case VerifyResult.ALREADY_VERIFIED:
            if (!user?.walletAddress) {
                throw new Error('[Telegram][Notify] Missing wallet address');
            }

            await bot.api.sendMessage(teleUserId, getVerifiedMessage(user.walletAddress));
            break;

        case VerifyResult.ALREADY_VERIFIED_WALLET_MISMATCHED:
            if (!user?.walletAddress) {
                throw new Error('[Telegram][Notify] Missing wallet address');
            }

            await bot.api.sendMessage(teleUserId, getVerifiedMismatchedMessage(user.walletAddress));
            break;

        case VerifyResult.ALREADY_VERIFIED_TELEGRAM_USER_MISMATCHED:
            // ignored
            console.log('[Telegram][Notify] Skip ALREADY_VERIFIED_TELEGRAM_USER_MISMATCHED', teleUserId);
            break;

        case VerifyResult.NO_WALLET_ADDRESS:
            await bot.api.sendMessage(teleUserId, getNoWalletAddressMessage());
            break;
        case VerifyResult.NO_USER:
            await bot.api.sendMessage(teleUserId, getNoUserMessage());
            break;
        default:
            break;
    }
}

export async function verifyAndNotify({
    teleUserId,
    teleUsername,
    walletAddress,
    allowedResults
}: {
    teleUserId: string
    teleUsername?: string
    walletAddress?: string
    allowedResults?: VerifyResult[]
}) {
    console.log('[Telegram] verifyAndNotify', {teleUserId, teleUsername, walletAddress, allowedResults});
    const result = await verify({teleUserId, teleUsername, walletAddress});
    console.log('[Telegram] verifyAndNotify got result', {teleUserId, result});
    if (result === VerifyResult.SUCCESS && walletAddress) {
        syncUserPoints(walletAddress);
    }

    await notify({teleUserId, verifyResult: result, allowedResults});
    console.log('[Telegram] verifyAndNotify notified', {teleUserId, result});
}

export function getBotInfo() {
    if (!bot) {
        throw new Error('[Telegram] Bot not initialized');
    }

    return bot.api.getMe();
}

export default function startTelegramBot() {
    if (!BIU_TELE_TOKEN || !BIU_TELE_GROUP_ID || !BIU_TELE_GROUP_INVITE_LINK) {
        if (!['prod', 'test'].includes(STAGE ?? '')) {
            console.log('[Telegram] Missing env keys, skip starting');

            return;
        }

        throw new Error('[Telegram] Missing env keys');
    }

    bot = new Bot<Context>(BIU_TELE_TOKEN);

    bot.command([commands.verify, commands.start], catchAsync(async ctx => {
        console.log('[Telegram][Command] message', ctx.message);

        const payload = ctx.message.text?.split(' ')[1]?.trim();
        console.log('[Telegram][Command] payload', payload);

        const teleUserId = ctx.from?.id;
        if (!teleUserId) {
            console.log('[Telegram][Command] Skip empty userId');

            return;
        }

        if (ctx.from?.is_bot) {
            console.log('[Telegram][Command] Skip bot user');

            return;
        }

        await verifyAndNotify({teleUserId, teleUsername: ctx.from?.username, walletAddress: payload});
    }));

    bot.on('chat_member', catchAsync(async ctx => {
        console.log('[Telegram][ChatMember]', ctx.chatMember);

        if (!!BIU_TELE_GROUP_ID && ctx.chat.id === +BIU_TELE_GROUP_ID) {
            const teleUserId = ctx.chatMember.new_chat_member.user.id;
            const targetTeleUser = await findUserByTelegramUserId(`${teleUserId}`);
            const pendingUsers = await findPendingTelegramUsers(new Date(Date.now() - +BIU_TELE_USER_PENDING_SECONDS * 1e3));
            const verifyingUsers = [
                ...(
                    !!targetTeleUser
                    && !isTelegramGroupJoined(targetTeleUser)
                    && pendingUsers.every(u => !u._id.equals(targetTeleUser._id))
                        ? [targetTeleUser]
                        : []
                ),
                ...pendingUsers
            ];

            for (const pendingUser of verifyingUsers) {
                const {
                    walletAddress,
                    telegram: {
                        userId: teleUserId = undefined,
                        username = undefined
                    } = {}
                } = pendingUser;

                if (teleUserId) {
                    await verifyAndNotify({teleUserId, teleUsername: username, walletAddress, allowedResults: [VerifyResult.SUCCESS]});
                }
            }
        }
    }));

    // Handle user replies
    bot.on('message', catchAsync(async ctx => {
        console.log('[Telegram] Received message', ctx.message);
        if (!BIU_TELE_GROUP_ID) {
            return;
        }

        // handle wallet address verification
        if (ctx.message.chat.type === 'private') {
            const teleUserId = ctx.from?.id;
            const text = ctx.message.text;

            if (!text || !teleUserId) {
                console.log('[Telegram][Private] Skip empty message');

                return;
            }

            if (ctx.from?.is_bot) {
                console.log('[Telegram][Private] Skip bot message', text);

                return;
            }

            await verifyAndNotify({teleUserId: `${teleUserId}`, teleUsername: ctx.from?.username, walletAddress: text.trim()});

            return;
        }
    }));

    bot.api.setMyCommands([
        {command: commands.verify, description: 'Verify your wallet address'}
    ]);

    bot.start({
        onStart: () => console.log('[Telegram] Bot started'),
        allowed_updates: ['message', 'chat_member']
    });

    return bot;
}
