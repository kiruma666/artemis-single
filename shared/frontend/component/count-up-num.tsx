import {useEffect, useRef, useState} from 'react';
import CountUp from 'react-countup';
import {useLocation} from 'react-router-dom';

type CountUpNumProp = {
    value: number,
    prefix?: string,
    suffix?: string,
    separator?: string
    decimals?: number
}

const CountUpNum: React.VFCC<CountUpNumProp> = ({value, ...rest}) => {
    const ref = useRef(value);
    const [startEndInfo, setStartEndInfo] = useState({start: 0, end: 0});
    const {pathname} = useLocation();

    useEffect(() => {
        setStartEndInfo({start: ref.current, end: value});
        ref.current = value;
    }, [value]);

    useEffect(() => {
        setStartEndInfo({start: 0, end: value});
    }, [pathname]);

    return (
        <CountUp
            start={startEndInfo?.start}
            end={startEndInfo?.end}
            decimals={2}
            duration={1.5}
            {...rest}
        />
    );
};

export default CountUpNum;
