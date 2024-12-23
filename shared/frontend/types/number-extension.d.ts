declare module '@ethersproject/bignumber' {
    interface BigNumber {

        toDecimal: (option?: ToDecimalOption) => string

        changeDecimals: (curDecimals: number, nextDecimals?: number) => BigNumber

        toFixed: (decimals?: number) => FixedNumber

        prettify: (option?: PrettifyOption) => string

        shorten: (options?: PrettifyOption) => string

        infinite: () => boolean

        noneZero: () => boolean

        toPercent: (options?: PrettifyOption) => string

    }

    namespace BigNumber {

        export let ZERO: BigNumber;

        export let ONE: BigNumber;

        export let INFINITY: BigNumber;

        export function fromDecimal(decimal: string, decimals?: number): BigNumber;

        export function fromNumber(decimal: string | number | null | undefined, decimals?: number): BigNumber | undefined;

        export function getMultiplier(decimals?: number): string;

    }

    interface FixedNumber {

        toBig: () => BigNumber

    }
}

export * from '@ethersproject/bignumber';
