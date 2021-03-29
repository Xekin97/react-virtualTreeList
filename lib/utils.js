export const recurse = (data, fn, childKey = "children") => {
	if (!(data instanceof Array) || typeof fn !== 'function') return
	const countItem = (item) => typeof fn === 'function' ? fn(item) : item
	return data.reduce((total, child) => {
	  if (!child) return total
	  const fnRes = countItem(child)
	  if (fnRes !== null) {
		if (child[childKey]) child[childKey] = recurse(child[childKey], fn, childKey)
		total.push(fnRes === void 0 ? child : fnRes)
	  }
	  return total
	}, [])
  }
  