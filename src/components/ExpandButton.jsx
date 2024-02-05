import React, {useCallback, useMemo} from 'react'

import Button from '@material/core/Button'
import KeyboardArrowDownRoundedIcon from '@material-ui/icons/KeyboardArrowDownRounded';
import KeyboardArrowRightRoundedIcon from '@material-ui/icons/KeyboardArrowRightRounded';

export const MuiSmallIconButton = styled(Button)`
	width: 18px;
	height: 18px;
	min-width: unset !important;
	padding: 0 !important;
	.MuiButton-label{
		min-width: 18px !important;
		width: 100%;
		.MuiSvgIcon-root{
			width: 100%;
			height: 100%;
			display: inline-block;
			font-size: 18px;
		}
	}
`

function ExpandButton(props) {
    const { onBtnClick, isExpand } = props
    
    const defaultProps = useMemo(() => {
        const result = {...props}
        delete result.onBtnClick
        delete result.isExpand
        return result
    }) 

    const handleClick = useCallback((e) => {
        e.stopPropagation()
        onBtnClick && onBtnClick(!isExpand)
    }, [isExpand, onBtnClick])

    return (
        <MuiSmallIconButton {...defaultProps} onClick={handleClick} color={isExpand ? 'primary' : 'default'}>
            { isExpand ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowRightRoundedIcon /> }
        </MuiSmallIconButton>
    )
}

export default React.memo(ExpandButton)