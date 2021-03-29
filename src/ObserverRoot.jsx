import React, {memo, forwardRef, useState, useContext, useRef, useCallback, useImperativeHandle } from 'react'

import { DataContext, CheckContext } from '../lib/Context'

export default memo(forwardRef((props, ref) => {
	const { data, className, style } = props

	const [showSection, setShowSection] = useState([0, 0]);
	const { specialHeight, nodeKey, nodeHeight, valueKey, expandable } = useContext(DataContext)
	const { selection, setSelection } = useContext(CheckContext)

	const observerRef = useRef({
		observer: null,
		wrapper: null,
		topBorderNode: null,
		bottomBorderNode: null,
		timer: null, // 备用监听 timer
		listenFunc: null,
		lastTop: 0, // 用于判断滚动方向
	})

	const resetSection = useCallback((entries, data) => {
		const capacityHeight = observerRef.current.wrapper.offsetHeight
		const topBorder = observerRef.current.wrapper.scrollTop
		const bottomBorder = topBorder + capacityHeight
		if (entries) {
			let needReset = false
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					needReset = true
					observerRef.current.observer.disconnect()
				}
			})
			if (!needReset) return
		}
		let start = -1
		let end = 0
		let account_height = 0
		for (let i = 0, l = data.length; i < l; i++) {
			const rowHeight = specialHeight[data[i][nodeKey]] || nodeHeight
			account_height += rowHeight
			if (topBorder <= account_height && start === -1) {
				start = i - 5 > 0 ? i - 5 : 0
			}
			if (bottomBorder <= account_height && !end) {
				end = i + 5
			}
		}
		if (!end) end = data.length
		setShowSection([start, end])
	}, [specialHeight, nodeKey, nodeHeight])

	const handleExpand = useCallback((item) => e => {
		if (!expandable) return 
		item._isExpand ? data.shrinkNode(item) : data.expandNode(item, true)
		resetSection(null, data)
	}, [data, expandable, resetSection])

	useEffect(() => {
		const refCur = observerRef.current
		const { wrapper, observer } = refCur
		if (!(data instanceof Array) || !data.length || observer !== null) return
		const options = {
			thresholds: 0.1,
			root: wrapper,
		}
		if (refCur.observer) refCur.observer.disconnect()
		refCur.observer = new IntersectionObserver((entries) => resetSection(entries, data), options)
		return () => {
			refCur.observer.disconnect()
			refCur.observer = null
		}
		// eslint-disable-next-line
	}, [data]);

	useEffect(() => {
		if (!data.length || !showSection[1]) return
		const { wrapper, observer } = observerRef.current
		if (!wrapper || !observer) return
		const nodes = wrapper.getElementsByClassName('visual-node')
		if (!nodes.length) return
		if (!nodes[0].classList.contains('top-node')) observer.observe(nodes[0])
		if (!nodes[nodes.length - 1].classList.contains('bottom-node')) observer.observe(nodes[nodes.length - 1])
		// eslint-disable-next-line
	}, [showSection]);

	useEffect(() => {
		if (data instanceof Array && data.length > 0) resetSection(null, data)
		// eslint-disable-next-line
	}, [data]);

	useEffect(() => {
		// 备用每隔 1s 检测监听器（防止滚动过快不触发 insection observer）
		const refCur = observerRef.current
		const { timer, listenFunc, wrapper, observer } = refCur
		if (listenFunc) wrapper.removeEventListener('scroll', listenFunc)
		if (timer) clearTimeout(timer)
		const listen = function (e) {
			if (timer) clearTimeout(timer)
			refCur.timer = setTimeout(() => {
				const capacityHeight = this.offsetHeight
				const topBorder = this.scrollTop
				const bottomBorder = topBorder + capacityHeight
				const nodes = this.getElementsByClassName('visual-node')
				if (!nodes.length) return
				const judgeTop = nodes[nodes.length >> 1].dataset.top  // 取一个数据中间的节点
				// 当在视角里的元素 top 值在 topBorder 之上
				// 当在视角里的元素 top 值在 bottomBorder 之下
				if (judgeTop < topBorder || judgeTop > bottomBorder) {
					observer.disconnect()
					resetSection(null, data)
				}
			}, 200);
		}
		refCur.listenFunc = listen
		wrapper.addEventListener('scroll', listen)
		return () => {
			wrapper.removeEventListener('scroll', listen)
			clearTimeout(timer)
			refCur.timer = null
		}
		// eslint-disable-next-line
	}, [data]);

	useImperativeHandle(ref, () => ({
		sort (fn) {
			if ( typeof fn !== 'function' || fn === void 0 || fn === null ) data.resetSort()
			else data.sortTree(fn)
			resetSection(null, data)
		},
		filter (fn) {
			if (!data._init) return
			if ( typeof fn !== 'function' || fn === void 0 || fn === null ) data.resetFilter()
			else data.filterTree(fn)
			// observerRef.current.wrapper.scrollTop = 0
			resetSection(null, data)
		},
		addNode (node, pkey) {
			data.addNode(node, pkey)
			resetSection(null, data)
		},
		delNode (keys) {
			data.delNode(keys)
			resetSection(null, data)
		},
		getDataHasInit () {
			return data._init
		},
		getSelection () {
			const result = []
			selection.forEach(key => {
				if (!key || data.hiddenSet.has(key)) return
				result.push(key)
			})
			return result
		},
		clearSelection () {
			setSelection(new Set())
		},
		allSelect () {
			const datas = Object.values(data.dataMap)
			const keys = datas.reduce((res, node) => {
				if (node.children && node.children.length) return res
				res.push(node[nodeKey])
				return res
			}, [])
			setSelection(new Set(keys))
		},
	}))

	return (
		<ObserverContext.Provider value= {{ showSection, handleExpand }}>
			<Capacity ref={ ele =>{ observerRef.current.wrapper = ele }} className={`${className || ''} data-root`} style={style}>
				{ props.children }
			</Capacity>
		</ObserverContext.Provider>
	)
}))
