import React, { memo, forwardRef, useContext } from 'react'
import { DataContext, ObserverContext } from '../lib/Context'
import { VisualWrapper } from './style'
import VisualNode from './TreeNode'

export default memo(forwardRef((props, ref) => {
	const { data, rowRender, rowAction } = props
	const { nodeKey, nodeHeight, specialHeight } = useContext(DataContext)
	const { showSection } = useContext(ObserverContext)
	const wrapperRef = useRef(null)
	
	const dataInfo = useMemo(() => {
		const [start, end] = showSection
		const showList = end ? data.slice(start, end+1) : blankArr
		if (!data.length || !end) return [{}, { maxHeight: 0 }, []]
		const topInfo = {}
		let account_top = 0
		const heightInfo = data.reduce((acc, cur, index) => {
			const rowHeight = specialHeight[cur[nodeKey]] || nodeHeight
			acc.maxHeight += rowHeight
			if (index > end) return acc
			if (index >= start) {
				topInfo[cur[nodeKey]] = account_top
				acc[cur[nodeKey]] = rowHeight
				account_top += rowHeight
				return acc
			} else {
				account_top += rowHeight
				return acc
			}
		}, { maxHeight: 0})
		return [topInfo, heightInfo, showList]
	}, [nodeKey, nodeHeight, showSection, data, specialHeight])

	const [topInfo, heightInfo, showList] = dataInfo

	return (
		<VisualWrapper ref={wrapperRef} height={heightInfo.maxHeight}>
			{
				heightInfo.maxHeight > 0 && showList.map(item => {
					return (
						<VisualNode
							className={`visual-node ${item === data[0] ? 'top-node' : ''} ${ item === data[data.length - 1] ? 'bottom-node' : '' }`} 
							data={item}
							key={item[nodeKey]}
							height={heightInfo[item[nodeKey]]}
							top={topInfo[item[nodeKey]]}
							rowRender={rowRender}
							rowAction={rowAction}
						/>
					)
				})
			}
		</VisualWrapper>
	)
}))