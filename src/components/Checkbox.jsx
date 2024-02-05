import React, { memo, useMemo } from 'react'

function getNodeLeafChildrenKeys(nodes, id_key) {
	if (!(nodes instanceof Array) || !nodes.length) return []
		const result = []
		const source = [...nodes]
		while (source.length) {
			const item = source.pop()
			if (item.children && item.children.length) source.push(...item.children)
			else result.push(item[id_key])
		}
		return result
}

export default memo((props) => {
	const { nodeKey, itemChildren, dataKey } = props
	const { selection, setSelection } = useContext(CheckContext)

	const children_ids = useMemo(() => {
		return getNodeLeafChildrenKeys(itemChildren, dataKey)
	}, [itemChildren, dataKey]) 

	const handleChange = e => {
		e.stopPropagation()
		const checked = e.target.checked
		function add() {
			if (children_ids && children_ids.length) children_ids.forEach(childKey => selection.add(childKey))
			else selection.add(nodeKey)
		}
		function del () {
			if (children_ids && children_ids.length) children_ids.forEach(childKey => selection.delete(childKey))
			else selection.delete(nodeKey)
		}
		checked ? add() : del()
		setSelection(new Set(selection))
	}

	const isCheck = children_ids && children_ids.length ? children_ids.every(childKey => selection.has(childKey)) : selection.has(nodeKey)

	return (
		<input readOnly className="tree-checkbox" type="checkbox" checked={isCheck} onClick={handleChange} />
	)
})