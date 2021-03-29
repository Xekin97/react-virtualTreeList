import { recurse } from './utils'

export default class VisualTreeData extends Array {
	constructor(data, key="id", opt={}){
		super()
		this.dataKey = key
		this.conf = Object.assign({
			expandable: true,
			defaultExpandLevel: 1,
			filterParent: false,
			defaultSort: null
		}, opt)
		this.dataMap = {}
		this.shrinkSet = new Set() // 这个 set 存了当前数据中没有被展开的数据 key
		this.hiddenSet = new Set() // 这个 set 存了被过滤的数据 key
		this.searchSet = new Set()  // 这个 set 存了搜索后保留的数据 key
		this._searching = false // 搜索时存个标记，因为存的是保留的数据，所以不知道 searchSet 为空的时候是否由搜索引起
		this._filterFn = null // 用于新增时判断节点是否被过滤
		this._sortFn = null // 用于新增时判断节点位置
		this._init = false
		this.initData(data, key, opt)
	}
	// 用 Array 原型的 slice 方法会再触发一次 constructor
	slice (begin, end) {
		end = (typeof end !== 'undefined') ? end : this.length;
		var i, cloned = [], size, len = this.length;
		var start = begin || 0;
		start = (start >= 0) ? start : Math.max(0, len + start);
		var upTo = (typeof end == 'number') ? Math.min(end, len) : len;
		if (end < 0) upTo = len + end;
		size = upTo - start;
		if (size > 0) {
		  cloned = new Array(size);
		  if (this.charAt) for (i = 0; i < size; i++) cloned[i] = this.charAt(start + i);
		  else for (i = 0; i < size; i++) cloned[i] = this[start + i];
		}
		return cloned;
	  };
	saveItemToMap (item) {
		this.dataMap[item[this.dataKey]] = item
	}
	initNode(node, index, level, parent, prev, next) {
		if (typeof index === 'object') {
			node.rowIndex = index[0] || 0
			node._oldIndex = index[1] || 0
		} else {
			node.rowIndex = index || 0
			node._oldIndex = index || 0
		}
		node._level = level || 0
		node._parentNode = parent || null
		node._nextNode = next || null
		prev && (prev._nextNode = node)
		node._isExpand = false
		node.children = node.children || []
		node._isLeaf = !node.children || !node.children.length
		this.saveItemToMap(node)
	}
	initData(data, key, opt){
		let index = 0
		let prevNode = null
		const { defaultSort, defaultExpandLevel=1, expandable } = opt
		const ds = typeof defaultSort === 'function' ? defaultSort : false
		const maxLevel = expandable ? defaultExpandLevel : 9999
		if (ds) data.sort(ds)
		if (data.length) {
			// 树扁平化
			recurse(data, (item) => {
				// 做成链表
				this.initNode(item, index, item._level, item._parentNode, prevNode, null)
				if (!item._isLeaf){
					if (ds) item.children.sort(ds)
					item.children.forEach(child => {
						child._parentNode = item
						child._level = item._level + 1
					})
				}
				prevNode = item
				if (item._level < maxLevel) {
					if (item._parentNode) item._parentNode._isExpand = true
					this.push(item)
				} else this.shrinkSet.add(item[key])
				index ++ 
			})
		}
		this._init = true
	}
	// 通过建立的列表重塑 index
	reSortDataRowIndex(item) {
		let prev = null
		if (item) {
			prev = item 
		} else {
			prev = this[0]
			prev.rowIndex = 0
		}
		let next = prev._nextNode
		while (next) {
			next.rowIndex = prev ? prev.rowIndex + 1 : 0
			prev = next
			next = next._nextNode
		}
	}
	removeItemFromMap (item) {
		delete this.dataMap[item[this.dataKey]]
	} 
	// 获取上一个节点
	getPrevNode (key) {
		if (!this.dataMap[key]) return null
		return this[this.dataMap[key].rowIndex - 1]
	}
	// 获取节点下所有子节点的 key
	getNodesAllChildrenKey (nodes) {
		if (!(nodes instanceof Array) || !nodes.length) return []
		const result = []
		const source = [...nodes]
		while (source.length) {
			const item = source.pop()
			result.push(item[this.dataKey])
			if (item.children) source.push(...item.children)
		}
		return result
	}
	deleteNodeFromParent (item) {
		if (item._parentNode) {
			item._parentNode.children = item._parentNode.children.filter(child => child[this.dataKey] !== item[this.dataKey])
		}
	}
	addNodeToParent (item) {
		if (item._parentNode) {
			const parent = item._parentNode
			if (parent.children.includes(item)) return
			parent.children instanceof Array ? parent.children.unshift(item) : parent.children = [item]
			parent._isLeaf = false
		}
	}
	findSortArrInsertIndex (item, aimArr) {
		if (!(aimArr instanceof Array)) return [0, 0]
		const newSortFn = this._sortFn
		const oriSortFn = this.conf.defaultSort
		let oriIdx = 0
		let newIdx = 0
		let isBreak = 0
		let length = aimArr.length || 0
		if (typeof oriSortFn !== 'function') isBreak ++
		if (typeof newSortFn !== 'function') isBreak ++
		while (length) {
			if (isBreak > 1) return [newIdx, oriIdx] 
			if (typeof oriSortFn === 'function' && oriSortFn(item, aimArr) < 1) {
				oriIdx++
				isBreak ++
			}
			if (typeof newSortFn === 'function' && newSortFn(item, aimArr) < 1) {
				newIdx++
				isBreak ++
			}
			length --
		}
		return [newIdx, oriIdx]
	}
	// addNode (item, pKey) {
	// 	const parent = pKey === void 0 ? null : this.dataMap[pKey]
	// 	const add = (opt, account) => {
	// 		const {node, next, parent, prev, index=0, level} = opt
	// 		this.initNode(node, index, level, parent, prev, next)
	// 		account = account || []
	// 		account.push(node)
	// 		this.addNodeToParent(node)
	// 		if (node.children && node.children.length) {
	// 			if (typeof this.conf.defaultSort === 'function') {
	// 				node.children.sort(this.conf.defaultSort)
	// 			}
	// 			const oldIndexes = node.children.map((e, idx) => idx)
	// 			if (typeof this._sortFn === 'function') {
	// 				node.children.sort(this._sortFn)
	// 			}
	// 			node.children.forEach((child, childIdx) => {
	// 				const newIndex = childIdx + account.length
	// 				const oldIndex = oldIndexes[childIdx] + account.length
	// 				add({
	// 					node: child,
	// 					prev: node.children[oldIndexes[childIdx] - 1] || node,
	// 					next: oldIndexes[childIdx] === node.children.length - 1 && next, 
	// 					parent: node,
	// 					index : [newIndex, oldIndex],
	// 					level: node._level + 1
	// 				}, account)
	// 			})
	// 		}
	// 		return account
	// 	}
	// 	if (!parent) { // 如果没有父节点，直接往 result 里面添加
	// 		const idx = this.findSortArrInsertIndex(item, this)
	// 		const addNodes = add({node:item, index: idx, prev: idx === 0 ? null : this[idx-1], next:this[idx]})
	// 		this.splice(idx[0], 0, addNodes[0])
	// 		this.reSortDataRowIndex()
	// 	} else { // 如果有, 则需要同步往父节点的 children 添加
	// 		const idx = this.findSortArrInsertIndex(item, parent.children)
	// 		const baseIndex = parent._nextNode ? parent._nextNode.rowIndex : parent.rowIndex + 1
	// 		const newIndex = baseIndex + idx[0]
	// 		const oldIndex = baseIndex + idx[1]
	// 		const level = parent ? parent._level + 1 : 0
	// 		const addNodes = add({
	// 			node: item,
	// 			prev: parent,
	// 			next: parent._nextNode,
	// 			parent,
	// 			index: [newIndex, oldIndex],
	// 			level
	// 		})
	// 		if (parent._isExpand) this.splice(newIndex, 0, addNodes[0])
	// 		this.reSortDataRowIndex(addNodes[addNodes.length - 1])
	// 	}
	// 	typeof this.conf.onAdd === 'function' && this.conf.onAdd(item);
	// 	return item
	// }
	// delNode (keys) {
	// 	const arr = (keys instanceof Array ? keys : [keys]).filter(key => this.dataMap[key] !== void 0)
	// 	const returnDelItems = []
	// 	if (!arr.length) return
	// 	const sortIndexKeys = arr.sort((a, b) => this.dataMap[b].rowIndex - this.dataMap[a].rowIndex)
	// 	let prevOfLastItem = null
	// 	sortIndexKeys.forEach((key, idx) => { 
	// 		if (idx === sortIndexKeys.length - 1) prevOfLastItem = this.getPrevNode(key)
	// 		if (!this.dataMap[key]) return
	// 		const node = this.dataMap[key]
	// 		const index = node.rowIndex
	// 		// 排序之后的 splice 不会破坏index顺序从而影响之后的 splice
	// 		returnDelItems.push(node)
	// 		this.splice(index, 1)
	// 		if (index > 0) this[index] ? 
	// 							this[index - 1]._nextNode = this[index] : 
	// 							delete this[index - 1]._nextNode
	// 		this.deleteNodeFromParent(node)
	// 		delete this.dataMap[key]
	// 		this.shrinkSet.delete(key)
	// 	})
	// 	this.reSortDataRowIndex(prevOfLastItem)
	// 	typeof this.conf.onDelete === 'function' && this.conf.onDelete(returnDelItems);
	// 	return returnDelItems
	// }
	setValue (valueArr) {
		const value = valueArr instanceof Array ? valueArr : [valueArr]
		this.length = 0
		this.push(...value)
		this.sort((a, b) => a.rowIndex - b.rowIndex)
	}
	// 展开收缩不改变原有数据以及链表结构
	expandNode (node, all) {
		if (!this.conf.expandable) return
		if (node.isLeaf || node._isExpand || !node.children || !node.children.length) return
		if (node._parentNode && !node._parentNode._isExpand) return
		if (all) {
			const keys = this.getNodesAllChildrenKey(node.children)
			keys.forEach(key => {
				this.shrinkSet.delete(key)
				const item = this.dataMap[key]
				if (this._searching) {
					if (this.searchSet.has(key)) {
						this.push(item)
						if (!item._isLeaf) item._isExpand = true
					}
				} 
				else if (!this.hiddenSet.has(key)) {
					this.push(item)
					if (!item._isLeaf) item._isExpand = true
				}
			})
		} else {
			for (let i = 0, l = node.children.length; i < l; i++) {
				const child = node.children[i]
				this.shrinkSet.delete(child[this.dataKey])
				if (this._searching) {
					if (this.searchSet.has(child[this.dataKey])) this.push(child)
				} 
				else if (!this.hiddenSet.has(child[this.dataKey])) this.push(child)
			}
		}
		this.sort((a, b) => a.rowIndex - b.rowIndex)
		node._isExpand = true
		typeof this.conf.onExpand === 'function' && this.conf.onExpand()
		return this
	}
	shrinkNode (node) {
		if (node.isLeaf) return
		if (node._parentNode && !node._parentNode._isExpand) return
		const keys = this.getNodesAllChildrenKey(node.children)
		const keySet = new Set(keys)
		keys.forEach(key => this.shrinkSet.add(key))
		const newArr = this.filter(item => {
			if (keySet.has(item[this.dataKey])) {
				item._isExpand = false
				return false
			}
			return true
		})
		this.setValue(newArr)
		node._isExpand = false
		typeof this.conf.onShrink === 'function' && this.conf.onShrink()
		return this
	}
	// 筛选不改变原有树结构以及列表排序标记
	sortTree (fn) {
		const hasSortNodeSet = new Set()
		let newIndex = 0
		const topLevelNodes = Object.values(this.dataMap).filter(node => node._parentNode === null)
		const sortTreeArr = (nodeArr) => {
			if (!(nodeArr instanceof Array) || !nodeArr.length) return
			nodeArr.sort(fn)
			nodeArr.forEach(node => {
				if (hasSortNodeSet.has(node[this.dataKey])) return 
				if (!this._sortFn) node._oldIndex = node.rowIndex // 只记录第一次排序的 index
				node.rowIndex = newIndex
				hasSortNodeSet.add(node[this.dataKey])
				newIndex ++
				if (node.children) sortTreeArr(node.children)
			})
		}
		sortTreeArr(topLevelNodes)
		this.sort((a, b) => a.rowIndex - b.rowIndex)
		this._sortFn = fn
	}
	resetSort () {
		this.sort((a, b) => a._oldIndex - b._oldIndex)
		Object.values(this.dataMap).forEach(node => {
			node.rowIndex = node._oldIndex
			delete node._oldIndex
		})
		this._sortFn = null
	}
	filterTree (fn) {
		// 筛选时 isSaveParent 为 true，会把父节点一起放进来筛选，且父节点被过滤时，其下所有子节点也会被过滤，而子节点全部被过滤时，仍保留父节点
		// 若为 false， 则父节点不参与筛选，只有当一个父节点的子节点全部被过滤时，父节点才被过滤
		if (typeof fn !== 'function') return
		const isSaveParent = this.conf.filterParent
		this._filterFn = fn
		const resultMap = {} // 优化过滤
		const hideNode = (node, filter) => {
			if (resultMap[node[this.dataKey]] !== void 0) return resultMap[node[this.dataKey]]
			const result = typeof filter === 'function' ? !!filter(node) : !!filter
			this.hiddenSet[result ? 'delete' : 'add'](node[this.dataKey])
			resultMap[node[this.dataKey]] = result
			return result
		}
		const hideNodeWithParent = (node, fn) => { // isSaveParent 为 true
			if (resultMap[node[this.dataKey]] !== void 0) return resultMap[node[this.dataKey]] // 如果该节点已被计算，则跳过
			const isRetain = hideNode(node, fn)
			if (!isRetain && node.children && node.children.length) {
				// 子节点
				node.children.forEach(child => hideNodeWithParent(child, false))
			}
		}
		const hideNodeWithoutParent = (node, fn) => { // isSaveParent 为 false
			if (resultMap[node[this.dataKey]] !== void 0) return resultMap[node[this.dataKey]]
			// 如果是叶子节点
			if ((!node.children || !node.children.length)) return hideNode(node, fn)
			// 如果不是叶子节点，是否保留该父节点
			let retainCurrent = false
			node.children.forEach(child => hideNodeWithoutParent(child, fn) && (retainCurrent = true))
			return hideNode(node, retainCurrent)
		}
		Object.values(this.dataMap).forEach(node => isSaveParent ? hideNodeWithParent(node, fn) : hideNodeWithoutParent(node, fn))
		this.updateSearchAndFilterResult()
		typeof this.conf.onFilter === 'function' && this.conf.onFilter(this)
		return this
	}
	resetFilter () {
		if (!this.hiddenSet.size) return
		// 把数据还给 this 重新排序
		this.hiddenSet.clear()
		this.updateSearchAndFilterResult()
		typeof this.conf.onFilter === 'function' && this.conf.onFilter(this)
	}
	updateSearchAndFilterResult() {
		// 已展开的数据里
		let newArr = Object.values(this.dataMap).filter(node => !this.shrinkSet.has(node[this.dataKey]))
		if (this._filterFn && !this._searching) {
			newArr = newArr.filter(node => !this.hiddenSet.has(node[this.dataKey]))
		} 
		else if (this._searching && !this._filterFn) {
			newArr = newArr.filter(node => this.searchSet.has(node[this.dataKey]))
		}
		else if (this._filterFn && this._searching) {
			// const searchSet = new Set()
			// newArr = newArr.filter(node => !this.hiddenSet.has(node[this.dataKey]))
		}
		this.setValue(newArr)
	}
	updateNode(key, newItem) {
		Object.assign(this.dataMap[key], newItem)
		typeof this.conf.onUpdate === 'function' && this.conf.onUpdate();
	}
}