/* eslint-disable no-underscore-dangle */

import {BigNumber, FixedFormat, FixedNumber} from '@ethersproject/bignumber';

const magnitudes = ['', 'K', 'M', 'B', 'T'];

const DefaultFixedFormat = FixedFormat.from({
    width: 256,
    decimals: 18,
    signed: true
});

// Returns a string "1" followed by decimal "0"s
export function getMultiplier(decimals = 18) {
    return `1${decimals > 0 ? '0'.repeat(decimals) : ''}`;
}

BigNumber.ZERO = BigNumber.from(0);

BigNumber.ONE = BigNumber.from('1');

BigNumber.INFINITY = BigNumber.from(`0x${'f'.repeat(64)}`);

BigNumber.fromDecimal = function(decimal: string, decimals: number = DefaultFixedFormat.decimals) {
    // replace comma added by prettify
    let decimalStr = decimal.replace(/,/g, '');

    // ensure not exceed max decimals
    const [integerPart, decimalPart] = decimalStr.split('.');
    if (decimalPart && decimals !== undefined && decimalPart.length > decimals && !decimalStr.includes('e')) {
        decimalStr = `${integerPart}.${decimalPart.slice(0, decimals)}`;

        console.warn(`${decimal} exceeds max decimals ${decimals}, truncated to ${decimalStr}`); // eslint-disable-line no-console
    }

    return BigNumber.from(FixedNumber.from(decimalStr, {...DefaultFixedFormat, decimals})._hex);
};

BigNumber.fromNumber = function(value: string | number | null | undefined, decimals: number = DefaultFixedFormat.decimals) {
    if (value === null || value === undefined) return undefined;

    if (typeof value === 'number') {
        if (isNaN(value)) return undefined;

        if (value === Infinity) return BigNumber.INFINITY;

        // convert scientific notation to decimal
        if (value.toString().includes('e+')) {
            value = BigInt(value).toString();
        }

        if (value.toString().includes('e-')) {
            const poweredValue = Number(value) * (10 ** decimals);

            if (poweredValue < 1) {
                return BigNumber.ZERO;
            }

            if (poweredValue.toString().includes('e+')) {
                return BigNumber.fromNumber(poweredValue, 0);
            }

            return BigNumber.from(Math.floor(poweredValue));
        }
    }

    return BigNumber.fromDecimal(typeof value === 'number' ? value.toFixed(decimals) : value, decimals);
};

BigNumber.getMultiplier = getMultiplier;

type ToDecimalOption = {
    decimals?: number // token contract defined decimal count
    precision?: number // UI presentation string kept decimal count
    removeTrailingZero?: boolean
};

BigNumber.prototype.toDecimal = function(option?: ToDecimalOption) {
    const {
        decimals = DefaultFixedFormat.decimals,
        precision,
        removeTrailingZero = true
    } = option ?? {};
    const fixedNumber = FixedNumber.fromValue(this, decimals, {...DefaultFixedFormat, decimals});
    const fixedStr = typeof precision === 'number' ? fixedNumber.round(precision).toString() : fixedNumber.toString();
    const [characteristic, originalMantissa = ''] = fixedStr.split('.');
    let mantissa = originalMantissa;
    const currentPrecision = mantissa.length;
    if (!removeTrailingZero && precision && currentPrecision < precision) {
        mantissa = mantissa.padEnd(precision, '0');
    }

    if (removeTrailingZero) {
        mantissa = mantissa.replace(/0+$/, '');
    }

    return mantissa ? characteristic + '.' + mantissa : characteristic;
};

BigNumber.prototype.changeDecimals = function(curDecimals: number, nextDecimals = 18) {
    const diff = nextDecimals - curDecimals;
    if (diff === 0) return this;

    const multiplier = getMultiplier(Math.abs(diff));

    return diff > 0 ? this.mul(multiplier) : this.div(multiplier);
};

BigNumber.prototype.toFixed = function(decimals = DefaultFixedFormat.decimals) {
    return FixedNumber.fromBytes(this._hex, {...DefaultFixedFormat, decimals});
};

export type PrettifyOption = ToDecimalOption & {
    separator?: string
};

BigNumber.prototype.prettify = function(option?: PrettifyOption) {
    const {
        decimals,
        precision = 4,
        removeTrailingZero = false,
        separator = ','
    } = option ?? {};

    const [originalCharacteristic, mantissa = ''] = this.toDecimal({decimals, precision, removeTrailingZero}).split('.');
    let characteristic = originalCharacteristic;
    if (separator) {
        characteristic = characteristic.replace(/\B(?=(\d{3})+\b)/g, separator);
    }

    return mantissa ? characteristic + '.' + mantissa : characteristic;
};

BigNumber.prototype.shorten = function(option?: PrettifyOption) {
    const characteristicLength = this.toDecimal({...DefaultFixedFormat, ...option, precision: 0}).length;
    const magnitude = Math.min(Math.floor((characteristicLength - 1) / 3), magnitudes.length - 1);

    // ensure always has three digits visible besides decimal dot
    const precision = Math.max(3 * (magnitude + 1) - characteristicLength, 0);
    const str = this.toString();
    const normalized = BigNumber.from(str.substring(0, str.length - 3 * magnitude));

    return normalized.prettify({precision}) + magnitudes[magnitude];
};

BigNumber.prototype.infinite = function() {
    // return this.eq(BigNumber.INFINITY);
    // maxLength is 66, include leading hex Ox
    return this._hex.length >= 62;
};

BigNumber.prototype.noneZero = function() {
    return !this.isZero();
};

BigNumber.prototype.toPercent = function(option?: PrettifyOption) {
    return this.mul(100).prettify({precision: 2, separator: ',', ...option}) + '%';
};

FixedNumber.prototype.toBig = function() {
    return BigNumber.from(this._hex);
};
