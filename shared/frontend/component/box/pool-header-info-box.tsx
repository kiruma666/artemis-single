import {Flex} from 'theme-ui';

export const PoolHeaderInfoBox: React.FCD = (
    {children, className}
) => {
    return (
        <Flex
            sx={{
                'width': ['100%', '80%'],
                'flexWrap': ['wrap', 'nowrap'],
                'alignItems': 'center',

                '> div': {
                    minWidth: ['50%', '20%'],
                    px: [0, 2],
                    mt: [3, 0]
                }
            }}
            className={className}
        >
            {children}
        </Flex>
    );
};
