// 递归遍历
export function recurse<Data extends Record<PropertyKey, any>>(
	data: Data[],
	childrenKey: PropertyKey,
	fn: (value: Data, index: number, parent?: Data) => void,
	parent?: Data
) {
	return data.forEach((item, index) => {
		const itemCloned = { ...item };
		fn(itemCloned, index, parent);
		const children = itemCloned[childrenKey];
		if (Array.isArray(children)) {
			recurse(children, childrenKey, fn, itemCloned);
		}
	});
}

// 递归 map
export function recurseMap<
	From extends Record<PropertyKey, any>,
	To extends Record<PropertyKey, any>
>(
	data: From[],
	childrenKey: PropertyKey,
	fn: (value: From, index: number, parent?: From) => To,
	parent?: From
) {
	return data.map((item, index) => {
		const itemCloned = { ...item };
		const children = itemCloned[childrenKey];
		if (Array.isArray(children)) {
			(itemCloned[childrenKey] as any) = recurseMap(children, childrenKey, fn, itemCloned);
		}
		return fn(itemCloned, index, parent);
	});
}
