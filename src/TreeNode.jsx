import React, { memo, useContext } from 'react'
import { useUpdate } from '../lib/hook'
import { DataContext, ObserverContext } from '../lib/Context'

import { VisualNodeWrapper } from './style'
import NodeCheckbox from './Checkbox'
import ExpandButton from './ExpandButton'

export default memo((props) => {
	const { className, data, top, height, rowRender, rowAction } = props
	const { valueKey, nodeKey, linkKey, rowStyle, showCheckbox, expandable, clickType } = useContext(DataContext)
	const { handleExpand } = useContext(ObserverContext)
	const update = useUpdate()

	const renderRow = (row) => {
		if (typeof rowRender === 'function') return rowRender(row, update)
		else return linkKey ? (
			<a className="value-link" rel="noopener noreferrer" target="_blank" href={row[linkKey]}>{row[valueKey]}</a>
		) : row[valueKey]
	}

	const nodeClick = e => {
		e.stopPropagation()
		switch (clickType) {
			case 'click':
				e.currentTarget.getElementsByClassName('value-link')[0].click()
			break;
			case 'expand':
			case 'check':
				e.currentTarget.getElementsByClassName('tree-checkbox')[0].click()
			break;
			default:
			break;
		}
	}

	const renderAction = (row) => {
		if (typeof rowAction === 'function') return rowAction(row, update)
		else return rowAction
	}

	const styleObj = typeof rowStyle === 'function' ? rowStyle(data) : rowStyle || {}
	
	return (
		<VisualNodeWrapper 
			className={className}
			data-rowindex={data.rowIndex}
			data-top={top}
			level={data._level}
			nodeHeight={height} 
			style={{transform: `translateY(${top}px)`, ...styleObj}}
			onClick={nodeClick}
		>
			{ showCheckbox && <NodeCheckbox itemChildren={data.children} nodeKey={data[nodeKey]} dataKey={nodeKey} />}
			<div className="levelbox"></div>
			&nbsp;
			{ expandable && !data._isLeaf && <ExpandButton onBtnClick={handleExpand(data)} isExpand={data._isExpand} />}
			&nbsp;
			<div className="value">
				{renderRow(data)}
			</div>
			{ rowAction && (
				<div className="action">
					{renderAction(data)}
				</div>
			) }
		</VisualNodeWrapper>
	)
})