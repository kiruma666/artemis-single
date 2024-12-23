/**
 * @Author: sheldon
 * @Date: 2024-06-13 00:11:15
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-14 18:33:34
 */

import axios from 'axios';

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

export async function verifyRecaptcha(token: string) {
    const secret = RECAPTCHA_SECRET;
    if (!secret) {
        throw new Error('RECAPTCHA_SECRET is not set');
    }

    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {params: {
        secret,
        response: token
    }});

    return response.data;
}
