import React, { memo, forwardRef, useState, useImperativeHandle, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'

import ObserverRoot from './ObserverRoot'
import VisualList from './TreeList'

function CheckData (props) {
	const { defaultCheck } = props
	const [selection, setSelection] = useState( new Set(defaultCheck) );
	return (
		<CheckContext.Provider value={{ selection, setSelection }}>
			{props.children}
		</CheckContext.Provider>
	)
}

const blankArr = []

const VisualTreeList = memo(forwardRef((props, ref) => {
	const { 
		data,
		nodeKey,
		valueKey,
		linkKey,
		nodeHeight,
		className,
		specialHeight,
		showCheckbox,
		expandable,
		style,
		rowStyle,
		rowRender,
		rowAction,
		expandLevel,
		filterParent,
		clickType,
	} = props
	
	const treeData = useMemo(() => {
		if (!(data instanceof Array) || !nodeKey) return blankArr
		else {
			const treeOptions = {
				expandable,
				filterParent,
				defaultExpandLevel: expandLevel,
			}
			return new VisualTreeData(data, nodeKey, treeOptions)
		}
		// eslint-disable-next-line
	}, [data])

	const ObserverMethods = useRef({})

	useImperativeHandle(ref, () => ObserverMethods)
	
	return (
		<DataContext.Provider value={{ nodeKey, linkKey, nodeHeight, valueKey, specialHeight, showCheckbox, rowStyle, expandable, clickType }}>
			<CheckData>
				<ObserverRoot 
					ref={ObserverMethods}
					className={className} 
					style={style}
					data={treeData}
				>
					<VisualList data={treeData} rowRender={rowRender} rowAction={rowAction} />
				</ObserverRoot>
			</CheckData>
		</DataContext.Provider>
	)
}))

VisualTreeList.defaultProps = {
	data: [],
	nodeKey: 'id',
	valueKey: 'value',
	nodeHeight: 40,
	specialHeight: {},
	showCheckbox: true,
	expandable: true,
	filterParent: false,
	defaultExpand: [],
	defaultCheck: [],
	expandLevel: 1,
	rowStyle: {},
	clickType: 'check'
}
VisualTreeList.propTypes = {
	data: PropTypes.array,
	nodeKey: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	valueKey: PropTypes.string,
	nodeHeight: PropTypes.number,
	specialHeight: PropTypes.object,
	showCheckbox: PropTypes.bool,
	defaultCheck: PropTypes.array,
	defaultExpand: PropTypes.array,
	filterParent: PropTypes.bool,
	expandLevel: PropTypes.number,
	expandable: PropTypes.bool,
	onExpand: PropTypes.func,
	onCheckNode: PropTypes.func,
	clickType: PropTypes.oneOf(['expand', 'check', 'click']),
	rowStyle: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
	rowRender: PropTypes.oneOfType([PropTypes.element, PropTypes.func]),
	rowAction: PropTypes.oneOfType([PropTypes.element, PropTypes.func])
}

export default React.memo(VisualTreeList)