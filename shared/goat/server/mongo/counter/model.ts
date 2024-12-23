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

export async function getNextSequenceValueForInviteCode() {
    return getNextSequenceValue('user_invite_code');
}
