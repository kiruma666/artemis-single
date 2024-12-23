import {BigNumber} from 'ethers';
import React from 'react';
import {Box, Flex, ThemeUIStyleObject} from 'theme-ui';

import {BNumberComponent} from '../big-number';

export type FormBoxProps = {
  title?: any,
  tailTitle?: any,
  icon?: any,
  className?: string,
  tokenName?: string,
  availableEstimated?: boolean,
  allowanceAmount?: string | BigNumber | null,
  allowanceLoading?: boolean,
  availableAmount?: string | BigNumber | null,
  availableLoading?: boolean,
  decimals?: number,
  extra?: any,
  containerSx?: ThemeUIStyleObject
  mainSx?: ThemeUIStyleObject
  disabled?: boolean
  bordered?: boolean
};

export const FormBox: React.FC<React.PropsWithChildren<FormBoxProps>> = ({
    children,
    title,
    tailTitle,
    icon,
    className,
    tokenName,
    allowanceAmount,
    allowanceLoading,
    availableEstimated = false,
    availableAmount,
    availableLoading,
    decimals,
    extra,
    containerSx,
    mainSx,
    disabled,
    bordered
}) => {
    return (
        <Box
            sx={{pb: '5px', width: ['100%', '500px'], ...containerSx}}
            className={className}
        >
            <Flex sx={{
                alignItems: ['flex-start', 'center'],
                justifyContent: 'space-between',
                flexDirection: ['column', 'row'],
                color: 'textPrimary',
                fontSize: 1,
            }}
            >
                {title && <Box sx={{fontWeight: 'bold', mb: [1, 0]}}>{title} {tokenName}</Box>}

                {(allowanceAmount !== undefined || availableAmount !== undefined) &&
                <Flex sx={{justifyContent: 'space-between', width: ['100%', '60%']}}>
                    <Box sx={{m: 0}}>
                        {allowanceAmount !== undefined &&
                        <>
                            Allowance: {
                                allowanceAmount
                                    ? <>
                                        {typeof allowanceAmount === 'string' ? allowanceAmount : (
                                            <BNumberComponent
                                                value={allowanceAmount}
                                                prettify={{precision: 2, decimals, removeTrailingZero: true}}
                                                loading={allowanceLoading}
                                            />
                                        )}
                                    </>
                                    : '--'
                            }
                        </>
                        }
                    </Box>

                    <Box sx={{m: 0}}>
                        {availableAmount !== undefined &&
                        <>
                            {availableEstimated && 'Estimated'}
                            Balance: {
                                availableAmount
                                    ? <>
                                        {typeof availableAmount === 'string' ? availableAmount : (
                                            <BNumberComponent
                                                value={availableAmount}
                                                prettify={{precision: 2, decimals, removeTrailingZero: true}}
                                                loading={availableLoading}
                                            />
                                        )}
                                    </>
                                    : '--'
                            }
                        </>
                        }
                    </Box>
                </Flex>
                }

                {tailTitle && <Box sx={{textAlign: ['left', 'right'], width: ['100%', 'auto']}}>{tailTitle}</Box>}
            </Flex>

            <Flex sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff',
                borderRadius: '10px',
                height: 50,
                px: 2,
                my: 2,
                border: bordered ? '1px solid #e1e2e3' : 'none',
                ...(disabled ? {backgroundColor: '#eee', cursor: 'not-allowed'} : {}),
                ...mainSx
            }}
            >
                <Box sx={{flexGrow: 1}}>
                    <Flex sx={{alignItems: 'center'}}>
                        {icon}
                        {children}
                    </Flex>
                </Box>
            </Flex>

            {extra}
        </Box>
    );
};
