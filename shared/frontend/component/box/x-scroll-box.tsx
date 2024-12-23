import {Box, BoxProps} from 'theme-ui';

const XScrollBox: React.FCD<BoxProps> = props => (
    <Box
        sx={{
            overflowY: 'hidden',
            overflowX: 'auto',
            maxWidth: '100%'
        }}
        {...props}
    />
);

export default XScrollBox;
