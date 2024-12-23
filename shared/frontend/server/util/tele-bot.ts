/*
 * @Author: xiaodongyu
 * @Date 2022-11-13 19:41:05
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-06-17 00:20:42
 * 
 * Rate limit for telegram bot:
 * 
 * - If you're sending bulk notifications to multiple users, the API will not allow more than 30 messages per second or so. 
 * - Also note that your bot will not be able to send more than 20 messages per minute to the same channel.
 * - Otherwise will receive 429 errors.
 * 
 * Ref:
 * - https://core.telegram.org/bots/faq#:~:text=If%20you're%20sending%20bulk,minute%20to%20the%20same%20group.
 * 
 * 
 */

import {Bot} from 'grammy';
import _ from 'underscore';

const {STAGE} = process.env;

const channels = {
    default: -894665872,
    dev: -1001940787352,
};

const bot = new Bot(process.env.TELE_TOKEN || 'fake_token');

type Message = {
    channel: keyof typeof channels
    text: string
    count?: number
}

const MessagesBuffer: Record<string, Message[]> = {}; // group -> Messages

const enqueueMessage = (group: string, message: Message) => {
    if (!MessagesBuffer[group]) {
        MessagesBuffer[group] = [];
    }

    const sameMessage = MessagesBuffer[group].find(({channel, text}) => channel === message.channel && text === message.text);
    if (sameMessage) {
        sameMessage.count = (sameMessage.count ?? 1) + (message.count ?? 1);
    } else {
        MessagesBuffer[group].push(message);
    }
};

// Still got 429 errors when messages are more than 10 per seconds, so decrease the limit to 10
// const MAX_TOTAL_MESSAGES_PER_SECOND = 20;
const MAX_TOTAL_MESSAGES_PER_SECOND = 10;
const sendEnqueuedMessages = _.throttle(() => {
    const flushedMessagesBuffer = Object.keys(MessagesBuffer)
        .filter(group => MessagesBuffer[group].length)
        .reduce((buffer, group) => {
            buffer[group] = MessagesBuffer[group].splice(0, MessagesBuffer[group].length);

            return buffer;
        }, {} as Record<string, Message[]>);

    const total = _.reduce(flushedMessagesBuffer, (sum, messages) => sum + messages.length, 0);
    const groupSize = _.size(flushedMessagesBuffer);
    let maxMessagePerGroup = MAX_TOTAL_MESSAGES_PER_SECOND;
    if (total > MAX_TOTAL_MESSAGES_PER_SECOND) {
        maxMessagePerGroup = Math.floor(MAX_TOTAL_MESSAGES_PER_SECOND / groupSize);
    } // else we are able to send all messages

    if (maxMessagePerGroup < 1) {
        // we are not able to send at least one message per group
        _.each(flushedMessagesBuffer, messages => messages.splice(0, messages.length).forEach(message => skipBotMessage(message)));

        sendBotMessage({
            channel: 'dev',
            text: `${total} messages in ${groupSize} groups are skipped, please check service log.`,
        });

        return;
    }

    _.each(flushedMessagesBuffer, (messages, group) => {
        const messagesToSend = messages.length > maxMessagePerGroup
            ? messages.splice(0, maxMessagePerGroup - 1) // left 1 for the skip notification
            : messages.splice(0, messages.length);
        messagesToSend.forEach(message => sendBotMessage(message));

        if (messages.length) {
            const messagesToSkip = messages.splice(0, messages.length);
            messagesToSkip.forEach(message => skipBotMessage(message));

            sendBotMessage({
                channel: 'dev',
                text: `${messagesToSkip.length} messages in group [${group}] are skipped, please check service log.`
            });
        }
    });
}, 2e3, {leading: false, trailing: true}); // ensure the last message is sent

const skipBotMessage = ({channel, text, count = 1}: Message) => {
    console.log(`[tele-bot] message skipped: (${count}) [${channel}] ${text}`);
};

const sendBotMessage = ({channel, text, count = 1}: Message) => {
    if (!process.env.TELE_TOKEN) {
        console.log(`[tele-bot] Token missing, not sending message: (${count}) [${channel}] ${text}`);

        return;
    }

    const message = count > 1 ? `${text} (x${count})` : text;
    bot.api.sendMessage(channels[channel], `[${STAGE}]${message}`).catch(err => {
        console.error(`[tele-bot] message failed: (${count}) [${channel}] ${text}`, err);
    });
};

export type MessageOptions = {
    channel?: keyof typeof channels
    group?: string // messages of each group will be limited per second averagely
}

export function sendMessage(text: string, {
    channel = 'default',
    group = 'ungrouped'
}: MessageOptions = {}) {
    enqueueMessage(group, {channel, text, count: 1});
    sendEnqueuedMessages();
}

export function startBot(commandMap: {[command: string]: {handler: () => any, reply?: string}}) {
    bot.on('message', ctx => {
        const {entities, text} = ctx.message;
        if (text && entities?.length) {
            let botCommand = '';
            entities.forEach(({offset, length, type}) => {
                if (type === 'bot_command') {
                    botCommand = text.substring(offset, offset + length);
                }
            });

            if (botCommand && commandMap[botCommand]) {
                const {handler, reply = `${botCommand} is running`} = commandMap[botCommand];
                handler();
                ctx.reply(reply);
            }
        }
    });

    bot.start();
}
