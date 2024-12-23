/**
 * @Author: sheldon
 * @Date: 2024-02-18 21:27:45
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-01 23:15:47
 */

const encryptionCodeMap: {[key: number | string]: number | string} = {
    0: '9',
    1: 'a',
    2: '8',
    3: '7',
    4: 'q',
    5: 'u',
    6: 'w',
    7: 'x',
    8: 'p',
    9: 'g',
    a: 'h',
    b: '4',
    c: '3',
    d: 'f',
    e: '2',
    f: 'b',
    g: 'c',
    h: 'r',
    i: 'o',
    j: 'm',
    k: '1',
    l: 'd',
    m: 'n',
    n: 'i',
    o: 'v',
    p: 't',
    q: 's',
    r: '5',
    s: '6',
    t: 'j',
    u: 'y',
    v: 'k',
    w: 'l',
    x: '0',
    y: 'z',
    z: 'e'
};

const decryptionCodeMap = Object.fromEntries(Object.entries(encryptionCodeMap).map(([key, value]) => [value, key]));
const AddressPrefx = '0x';

export function decodeInviterCode(code: string): string {
    if (!code || code.length < 2 || code.startsWith(AddressPrefx)) {
        return code;
    }

    const inviterAddress = AddressPrefx + code.slice(1, -1).split('').map((char: string) => {
        return decryptionCodeMap[char];
    }).join('');

    if (inviterAddress.length !== 42) {
        console.log('invalid inviter', {code, inviterAddress});

        return '';
    }

    return inviterAddress;
}
