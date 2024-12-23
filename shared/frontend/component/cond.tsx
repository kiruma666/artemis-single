import {Box, BoxProps} from 'theme-ui';

type CondProp = {
    cond: any,
    fragment?: boolean
} & BoxProps;

const Cond: React.FCC<CondProp> = ({cond, fragment, children, ...rest}) => {
    const [successEl, failEl, ...useless] = ([] as any).concat(children);
    const child = cond ? successEl : failEl;

    if (useless?.length) {
        // eslint-disable-next-line no-console
        console.error('Cond takes at most 2 children! Got', 2 + useless.length, '.');
    }

    if (fragment) return child;

    return (
        <Box {...rest}>
            {child}
        </Box>
    );
};

export default Cond;
