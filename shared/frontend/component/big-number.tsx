import {Popover} from 'antd';
import {BigNumber} from 'ethers';
import {useMemo} from 'react';
import {Spinner} from 'theme-ui';

import {useContinuousLoading} from '@shared/fe/hook/use-variable-loading';
import {PrettifyOption} from '@shared/fe/util/number-extension';

type ContentFormat = 'amount' | 'fiatValue' | 'amountAndSymbol' | 'amountAndFiatValue' | 'amountAndFiatValueAndSymbol';

type Props = {
    value?: BigNumber | number | string | null
    minDisplayValue? : BigNumber
    maxDisplayValue? : BigNumber

    prettify?: PrettifyOption
    percent?: boolean

    prefix?: string // such as '$', do NOT use with `symbol`

    symbol?: string // token symbol
    price?: number
    priceSymbol?: string

    contentFormat?: ContentFormat

    popoverDisabled?: boolean
    loading?: boolean
}

const noValue = '--';
const defaultDecimals = 18;
const defaultPrecision = 2;
const defaultMaxValue = '9999000000';
const million = '1000000';
const thousand = '1000';

const getMinDisplayValue = (precision: number) => `0.${'1'.padStart(precision, '0')}`;

type GetDisplayValueOptions = {
    value?: BigNumber | number | string | null
    minDisplayValue? : BigNumber
    maxDisplayValue? : BigNumber

    prettify?: PrettifyOption
    percent?: boolean

    prefix?: string // such as '$', do NOT use with `symbol`
    price?: number

    shorten?: boolean
}

function getDisplayValue({
    value: originalValue,
    minDisplayValue,
    maxDisplayValue,

    prettify: prettifyOption,
    percent,

    prefix = '',
    price,

    shorten = true
}: GetDisplayValueOptions) {
    const {decimals = defaultDecimals, precision = defaultPrecision} = prettifyOption || {};
    const minValue = minDisplayValue || BigNumber.fromDecimal(getMinDisplayValue(precision), decimals);
    const maxValue = maxDisplayValue || BigNumber.fromDecimal(defaultMaxValue, decimals);
    let value = typeof originalValue === 'number' || typeof originalValue === 'string' ? BigNumber.fromNumber(originalValue, decimals) : originalValue;
    if (!value) return noValue;
    if (price) {
        const priceDecimals = `${price}`.split('.')[1]?.length ?? 0;
        value = value.mul(BigNumber.fromDecimal(`${price}`, priceDecimals)).div(BigNumber.fromDecimal('1', priceDecimals));
    }

    let percentSymbol = '';
    if (percent) {
        value = value.mul(100);
        percentSymbol = '%';
    }

    if (shorten) {
        if (value.gte(maxValue)) {
            return `>${prefix}${maxValue.div(BigNumber.from(million)).prettify({...prettifyOption, removeTrailingZero: true})}M${percentSymbol}`;
        }

        if (value.gte(BigNumber.fromDecimal(million, decimals))) {
            return `${prefix}${value.div(BigNumber.from(million)).prettify(prettifyOption)}M${percentSymbol}`;
        }

        if (value.gte(BigNumber.fromDecimal(thousand, decimals))) {
            return `${prefix}${value.div(BigNumber.from(thousand)).prettify(prettifyOption)}K${percentSymbol}`;
        }
    }

    if (value.gt(BigNumber.ZERO) && value.lt(minValue)) {
        return `<${prefix}${minValue.prettify(prettifyOption)}${percentSymbol}`;
    }

    return `${prefix}${value.prettify(prettifyOption)}${percentSymbol}`;
}

const useDisplayValue = (options: GetDisplayValueOptions) => {
    return useMemo(() => {
        try {
            return getDisplayValue(options);
        } catch (err) {
            console.error(err); // eslint-disable-line no-console

            return 'Err';
        }
    }, [JSON.stringify(options)]); // only recompute when options changed
};

export const BNumberComponent:React.FC<Props> = props => {
    const {
        prettify: prettifyOptions,

        price,
        priceSymbol = '$',

        contentFormat = 'amount',

        popoverDisabled,
        loading: isLoading,

        ...restProps
    } = props;

    const {loading} = useContinuousLoading(isLoading);

    const {
        decimals = defaultDecimals,
        precision = defaultPrecision,
        ...opts
    } = prettifyOptions || {};

    const prettify = {decimals, precision, ...opts};
    const tooltipPrettify = {
        ...prettify,
        precision: Math.min(prettify.precision + 2, prettify?.decimals ?? defaultDecimals)
    };

    const contentValue = useDisplayValue({
        ...restProps,
        prettify
    });

    const tooltipValue = useDisplayValue({
        ...restProps,
        prettify: tooltipPrettify,
        shorten: false
    });

    const fiatContentValue = useDisplayValue({
        ...restProps,
        prettify,

        prefix: priceSymbol,
        price,
    });

    const fiatTooltipValue = useDisplayValue({
        ...restProps,
        prettify: tooltipPrettify,
        shorten: false,

        prefix: priceSymbol,
        price,
    });

    const popoverContent = (
        <div style={{textAlign: 'right'}}>
            {tooltipValue}
            {!!price && fiatTooltipValue && <>({fiatTooltipValue})</>}
                &nbsp;
            {props.symbol}
        </div>
    );

    const content = (
        <>
            {contentFormat === 'amount' && contentValue}

            {contentFormat === 'fiatValue' && fiatContentValue}

            {contentFormat === 'amountAndSymbol' && (
                <>
                    {contentValue}
                    {props.symbol && <> {props.symbol}</>}
                </>
            )}

            {contentFormat === 'amountAndFiatValue' && (
                <>
                    {contentValue}
                    {fiatContentValue && <>({fiatContentValue})</>}
                </>
            )}

            {contentFormat === 'amountAndFiatValueAndSymbol' && (
                <>
                    {contentValue}
                    {fiatContentValue && <>({fiatContentValue})</>}
                    {props.symbol && <> {props.symbol}</>}
                </>
            )}

            {loading && (
                <Spinner
                    size='12px'
                    sx={{marginLeft: 1, color: 'inherit', verticalAlign: 'middle'}}
                />
            )}
        </>
    );

    if (popoverDisabled) {
        return content;
    }

    return (
        <Popover content={popoverContent}>
            <div
                sx={{
                    display: 'inline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
                onClick={e => e.stopPropagation()} // prevent collapse panel triggers in mobile
            >
                {content}
            </div>
        </Popover>
    );
};

export const addIfNoneUndefined = (...args: (BigNumber | undefined | null)[]): BigNumber | undefined => {
    if (args.some(arg => !arg)) {
        return undefined;
    }

    return (args as BigNumber[]).reduce((acc, cur) => acc.add(cur), BigNumber.ZERO);
};

export const firstNoneZero = (...args: (BigNumber | undefined)[]): BigNumber | undefined => {
    return args.find(arg => arg?.noneZero());
};
