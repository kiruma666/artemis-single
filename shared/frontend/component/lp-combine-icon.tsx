import {Box, Image, ThemeUIStyleObject} from 'theme-ui';

import Cond from '@shared/fe/component/cond';

type LpIconProps = {
    icons: Array<string | React.FCSVG>
}

const size = 30;
const cover = 10;
export const LpCombineIcon: React.FC<LpIconProps> = ({icons}) => (
    <Box
        sx={{
            whiteSpace: 'nowrap',
            minWidth: icons.length * (size - cover) + 2 * cover,

            // for svg
            fontSize: size,
            lineHeight: 1,
            height: size
        }}
    >
        {
            icons.map((CompOrUrl, idx) => {
                const sx: ThemeUIStyleObject = {
                    // common
                    position: 'relative',
                    left: -cover * idx,
                    borderRadius: '100%',

                    // for image
                    width: size,
                    verticalAlign: 'unset',
                };

                return (
                    <Cond
                        key={idx}
                        cond={typeof CompOrUrl === 'string'}
                        fragment
                    >
                        <Image
                            src={CompOrUrl as string}
                            sx={sx}
                        />

                        <CompOrUrl sx={sx}/>
                    </Cond>
                );
            })
        }
    </Box>
);
