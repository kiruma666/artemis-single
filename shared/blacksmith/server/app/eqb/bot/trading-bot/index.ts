import {Bot, Context} from 'grammy';

import {catchAsync} from '@shared/fe/util/async';

import {
    STAGE,
    EQB_TRADING_BOT_TELE_TOKEN
} from 'server/util/constant';

import {getAllVendorPointsGroupsInTextFormat} from '../../vendor';

import {getWelcomeMessage} from './message-utils';

const commands = {
    start: 'start',
    query: 'query',
};

let bot: Bot<Context> | undefined;

const handleMessage = catchAsync(
    async (teleUserId: number, message: string) =>
        bot?.api.sendMessage(teleUserId, await getAllVendorPointsGroupsInTextFormat(message))
);

export default function startEqbTradingBot() {
    if (!EQB_TRADING_BOT_TELE_TOKEN) {
        if (!['prod', 'test'].includes(STAGE ?? '')) {
            console.log('[EQB][TradingBot] Missing env keys, skip starting');

            return;
        }

        throw new Error('[EQB][TradingBot] Missing env keys');
    }

    bot = new Bot<Context>(EQB_TRADING_BOT_TELE_TOKEN);

    bot.command([commands.start, commands.query], async ctx => {
        console.log('[EQB][TradingBot][Command] message', ctx.message);

        const payload = ctx.message?.text?.split(' ')[1]?.trim();
        console.log('[EQB][TradingBot][Command] payload', payload);
        if (!payload) {
            console.log('[EQB][TradingBot][Command] Skip empty payload');

            await ctx.reply(getWelcomeMessage(), {parse_mode: 'Markdown'});

            return;
        }

        const teleUserId = ctx.from?.id;
        if (!teleUserId) {
            console.log('[EQB][TradingBot][Command] Skip empty userId');

            return;
        }

        if (ctx.from?.is_bot) {
            console.log('[EQB][TradingBot][Command] Skip bot user');

            return;
        }

        await handleMessage(teleUserId, payload);
    });

    // Handle user replies
    bot.on('message', async ctx => {
        console.log('[EQB][TradingBot] Received message', ctx.message);
        if (ctx.message.chat.type === 'private') {
            const teleUserId = ctx.from?.id;
            const text = ctx.message.text;

            if (!text || !teleUserId) {
                console.log('[EQB][TradingBot][Private] Skip empty message');

                return;
            }

            if (ctx.from?.is_bot) {
                console.log('[EQB][TradingBot][Private] Skip bot message', text);

                return;
            }

            await handleMessage(teleUserId, text);
        }
    });

    bot.api.setMyCommands([
        {command: commands.query, description: 'Query your points'}
    ]);

    bot.start({
        onStart: () => console.log('[EQB][TradingBot] Bot started')
    });

    return bot;
}
