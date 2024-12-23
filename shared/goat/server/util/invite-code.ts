import Hashids from 'hashids';

import {getNextSequenceValueForInviteCode} from 'server/mongo/counter/model';

const hash = new Hashids('user invite code', 6, 'abcdefghijklmnopqrstuvwxyz0123456789');

export async function generateInviteCode() {
    const value = await getNextSequenceValueForInviteCode();

    return hash.encode(value);
}
