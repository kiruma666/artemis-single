import Hashids from 'hashids';
import {Schema, model} from 'mongoose';

const counterSchema = new Schema({
    _id: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        default: 0
    }
});

const Counter = model('Counter', counterSchema);

async function getNextSequenceValue(_id: string) {
    const result = await Counter.findOneAndUpdate(
        {_id},
        {$inc: {value: 1}},
        {new: true, upsert: true} // Ensures the returned document is the updated one, creates it if it doesn't exist
    );

    return result.value;
}

const hash = new Hashids('user invite code', 6, 'abcdefghijklmnopqrstuvwxyz0123456789');

export async function generateBiuUserInviteCode() {
    const value = await getNextSequenceValue('biu_user_invite_code');

    return hash.encode(value);
}
