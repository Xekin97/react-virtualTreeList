import { ERROR_PREFIX } from "../constants";
import { recurse } from "../utils";

type CommonObject = Record<PropertyKey, any>;

export interface TreeChainNodeDetail<T extends CommonObject> {
	tailNode: TreeChainNode<T>;
	includeNodes: TreeChainNode<T>[];
}

export interface ConfigCreateTreeChain {
	childrenKey?: PropertyKey;
	dataKey?: PropertyKey;
}

type SortFn<Data extends CommonObject> = (a: TreeChainNode<Data>, b: TreeChainNode<Data>) => number;

type FilterFn<Data extends CommonObject> = (data: TreeChainNode<Data>) => boolean;

export interface ConfigToArray<Data extends CommonObject> {
	filter?: FilterFn<Data>;
	keepAncestorsWithChildren?: boolean;
	keepParentWithoutChildren?: boolean;
	sort?: SortFn<Data>;
	startKey?: PropertyKey;
	count?: number;
}

const DEFAULT_CONFIGCREATE: ConfigCreateTreeChain = {
	dataKey: "id",
	childrenKey: "children",
};

function isPropertyKey(key: any): key is PropertyKey {
	return typeof key === "string" || !Number.isNaN(key) || typeof key === "symbol";
}

export class TreeChainNode<Data extends CommonObject> {
	key: PropertyKey = "";
	prevNode?: TreeChainNode<Data>;
	nextNode?: TreeChainNode<Data>;
	parentNode?: TreeChainNode<Data>;
	siblingPrevNode?: TreeChainNode<Data>;
	siblingNextNode?: TreeChainNode<Data>;
	childNodes: TreeChainNode<Data>[] = [];

	detachCallbacks: ((node: TreeChainNode<Data>) => {})[] = [];
	InsertCallbacks: ((node: TreeChainNode<Data>) => {})[] = [];
	destroyCallbacks: ((node: TreeChainNode<Data>) => {})[] = [];

	protected _includeNodes: TreeChainNode<Data>[] = [];
	get includeNodes() {
		this._includeNodes.length = 0;

		this.each((node) => {
			this._includeNodes.push(node);
		});

		return this._includeNodes;
	}

	protected _ancestors: TreeChainNode<Data>[] = [];
	get ancestors() {
		this._ancestors.length = 0;
		this.eachParent((ancestor) => {
			this._ancestors.push(ancestor);
		});
		return this._ancestors;
	}

	get firstAncestor() {
		const length = this._ancestors.length;
		if (length > 0 && this._ancestors[length - 1].parentNode === void 0) {
			return this._ancestors[length - 1];
		} else {
			const ancestors = this.ancestors;
			return ancestors[ancestors.length - 1];
		}
	}

	get tail() {
		let tailNode: TreeChainNode<Data> = this;

		while (tailNode.childNodes.length > 0) {
			tailNode = tailNode.childNodes[tailNode.childNodes.length - 1];
		}

		return tailNode;
	}

	get leaf() {
		return this.childNodes.length === 0;
	}

	get level() {
		let num = 0;

		let parent = this.parentNode;

		while (parent) {
			parent = parent.parentNode;
			num++;
		}

		return num;
	}

	constructor(public data: Data | null = null, keyName: PropertyKey = "id") {
		if (!data) return;
		if (!isPropertyKey(keyName)) {
			throw new Error(ERROR_PREFIX + `Invalid key name "${String(keyName)}" in data.`);
		}
		if (!isPropertyKey(data[keyName])) {
			throw new Error(ERROR_PREFIX + `Invalid key "${String(data[keyName])}" in data.`);
		}
		this.key = data[keyName];
	}

	protected takeDetachCallbacks() {
		this.detachCallbacks.forEach((cb) => cb(this));
	}

	protected takeInsertCallbacks() {
		this.InsertCallbacks.forEach((cb) => cb(this));
	}

	protected takeDestroyCallbacks() {
		this.destroyCallbacks.forEach((cb) => cb(this));
	}

	onDetach(callback: (node: TreeChainNode<Data>) => {}) {
		this.detachCallbacks.push(callback);
	}
	onInsert(callback: (node: TreeChainNode<Data>) => {}) {
		this.InsertCallbacks.push(callback);
	}
	onDestroy(callback: (node: TreeChainNode<Data>) => {}) {
		this.destroyCallbacks.push(callback);
	}

	each(
		callback: (node: TreeChainNode<Data>, index: number, parent?: TreeChainNode<Data>) => void
	) {
		const node = this as TreeChainNode<Data>;
		recurse([node], "childNodes", (_node, index, parent, native) =>
			callback(native, index, parent)
		);

		return this;
	}

	eachParent(callback: (node: TreeChainNode<Data>) => void) {
		let parent = this.parentNode;

		while (parent) {
			callback(parent);
			parent = parent.parentNode;
		}
	}

	clean() {
		this.prevNode = void 0;
		this.nextNode = void 0;
		this.parentNode = void 0;
		this.childNodes = [];
		this.siblingNextNode = void 0;
		this.siblingPrevNode = void 0;
		return this;
	}

	detach() {
		const oPrevNode = this.prevNode;
		const oSibilingPrevNode = this.siblingPrevNode;
		const oSibilingNextNode = this.siblingNextNode;

		if (oPrevNode) {
			oPrevNode.nextNode = oSibilingNextNode;
		}
		if (oSibilingPrevNode) {
			oSibilingPrevNode.siblingNextNode = oSibilingNextNode;
		}
		if (oSibilingNextNode) {
			oSibilingNextNode.siblingPrevNode = oSibilingPrevNode;
			oSibilingNextNode.prevNode = oPrevNode;
		}
		if (this.parentNode) {
			this.parentNode.childNodes = this.parentNode.childNodes.filter((node) => node !== this);
		}

		this.prevNode = void 0;
		this.parentNode = void 0;
		this.tail.nextNode = void 0;
		this.siblingNextNode = void 0;
		this.siblingPrevNode = void 0;

		this.takeDetachCallbacks();

		return this;
	}

	insertInto(left: TreeChainNode<Data> | null, right: TreeChainNode<Data> | null) {
		const thisTail = this.tail;

		const isSiblingHead = left === null && right !== null && right.siblingPrevNode === void 0;
		const isSiblingTail = left !== null && right === null && left.siblingNextNode === void 0;
		const isRightNextToLeft = left?.nextNode === right;
		const isRightSiblingNextToLeft = left?.siblingNextNode === right;
		const isLeftTheParentOfRight = right?.parentNode === left;
		const isIndependentNode = !this.prevNode && !thisTail.nextNode;

		if (!isIndependentNode) {
			throw new Error(
				ERROR_PREFIX + "This chain node is used to other chain, please detach."
			);
		}

		if (isSiblingHead) {
			this.parentNode = right.parentNode;
			if (this.parentNode) {
				this.prevNode = this.parentNode;
				this.parentNode.childNodes.unshift(this);
			}

			right.prevNode = thisTail;
			thisTail.nextNode = right;

			right.siblingPrevNode = this;
			this.siblingNextNode = right;
		} else if (isSiblingTail) {
			const leftTail = left.tail;

			this.parentNode = left.parentNode;
			if (this.parentNode) {
				this.parentNode.childNodes.push(this);
			}

			leftTail.nextNode = this;
			this.prevNode = leftTail;

			left.siblingNextNode = this;
			this.siblingPrevNode = left;
		} else if (isRightNextToLeft && isRightSiblingNextToLeft) {
			this.parentNode = left.parentNode;

			if (this.parentNode) {
				const index = this.parentNode.childNodes.findIndex((child) => child === left);
				this.parentNode.childNodes.splice(index + 1, 0, this);
			}

			left.nextNode = this;
			this.prevNode = left;

			left.siblingNextNode = this;
			this.siblingPrevNode = left;

			right.prevNode = thisTail;
			thisTail.nextNode = right;

			right.siblingPrevNode = this;
			this.siblingNextNode = right;
		} else if (isRightNextToLeft && isLeftTheParentOfRight) {
			this.parentNode = left;
			this.parentNode.childNodes.unshift(this);

			left.nextNode = this;
			this.prevNode = left;

			right.prevNode = thisTail;
			thisTail.nextNode = right;

			right.siblingPrevNode = this;
			this.siblingNextNode = right;
		} else if (isRightSiblingNextToLeft) {
			this.parentNode = left.parentNode;

			if (this.parentNode) {
				const index = this.parentNode.childNodes.findIndex((child) => child === left);
				this.parentNode.childNodes.splice(index + 1, 0, this);
			}

			const leftTail = left.tail;
			leftTail.nextNode = this;
			this.prevNode = leftTail;

			left.siblingNextNode = this;
			this.siblingPrevNode = left;

			right.prevNode = thisTail;
			thisTail.nextNode = right;

			right.siblingPrevNode = this;
			this.siblingNextNode = right;
		} else if (isRightNextToLeft) {
			this.parentNode = left.parentNode;

			if (this.parentNode) {
				this.parentNode.childNodes.push(this);
			}

			left.siblingNextNode = this;
			this.siblingPrevNode = left;

			const leftTail = left.tail;
			leftTail.nextNode = this;
			this.prevNode = leftTail;

			right.prevNode = thisTail;
			thisTail.nextNode = right;
		} else {
			throw new Error(
				ERROR_PREFIX +
					"Invalid insert because the left node is unrelated to the right node."
			);
		}

		this.takeInsertCallbacks();

		return this;
	}

	insertChild(node: TreeChainNode<Data>) {
		if (!!this.childNodes.length) {
			const right = this.childNodes[0];
			return node.insertInto(this, right);
		}

		return this.addChildIfHasNoChildNodes(node);
	}

	addChild(node: TreeChainNode<Data>) {
		if (!!this.childNodes.length) {
			const left = this.childNodes[this.childNodes.length - 1];
			return node.insertInto(left, null);
		}

		return this.addChildIfHasNoChildNodes(node);
	}

	addChildIfHasNoChildNodes(node: TreeChainNode<Data>) {
		const nodeTail = node.tail;

		if (node.prevNode || nodeTail.nextNode) {
			throw new Error(
				ERROR_PREFIX + "This chain node is used to other chain, please detach."
			);
		}

		node.parentNode = this;
		this.childNodes.push(node);

		if (this.nextNode) {
			this.nextNode.prevNode = nodeTail;
			nodeTail.nextNode = this.nextNode;
			this.nextNode = node;
			node.prevNode = this;
		} else {
			this.nextNode = node;
			node.prevNode = this;
		}

		this.takeInsertCallbacks();

		return this;
	}

	destroy() {
		const needDetach = !!this.prevNode || !!this.tail.nextNode;
		if (needDetach) {
			this.detach();
		}
		this._destroy();
	}

	protected _destroy() {
		this.childNodes.forEach((child) => child._destroy());
		this.data = null;
		this.clean();
		this.takeDestroyCallbacks();
	}
}

export class TreeChain<Data extends CommonObject> {
	protected _map: Map<PropertyKey, TreeChainNode<Data>> = new Map();
	get map(): Map<PropertyKey, TreeChainNode<Data>> {
		if (this._map.size) return this._map;
		const map = new Map();
		TreeChain.eachChain(this.chain, (node) => {
			map.set(node.key, node);
		});
		this._map = map;
		return map;
	}

	get chain() {
		if (this._chain === null) {
			throw new Error(ERROR_PREFIX + "Empty chain.");
		}
		return this._chain;
	}

	protected _topLevelNodes: TreeChainNode<Data>[] = [];
	get topLevelNodes() {
		this._topLevelNodes.length = 0;
		this._topLevelNodes.push(...this.getNodesByLevel());
		return this._topLevelNodes;
	}

	constructor(protected _chain: TreeChainNode<Data> | null) {}

	protected beforeInsertNode(node: TreeChainNode<Data>) {
		const keyDuplicated = node.includeNodes.find((includeNode) =>
			this.map.has(includeNode.key)
		);

		if (keyDuplicated) {
			throw new Error(
				ERROR_PREFIX +
					`The key of the inserted node \`${String(
						keyDuplicated.key
					)}\` already exists in the chain.`
			);
		}
	}

	protected afterInsertNode(node: TreeChainNode<Data>) {
		node.includeNodes.forEach((includeNode) => {
			this.map.set(includeNode.key, includeNode);
		});

		if (node.siblingNextNode === this._chain) {
			this._chain = node;
		}
	}

	protected beforeDetachNode(node: TreeChainNode<Data>) {
		if (node.key === this._chain?.key) {
			this._chain = node.siblingNextNode || null;
		}
	}

	protected afterDetachNode(node: TreeChainNode<Data>) {
		node.includeNodes.forEach((includeNode) => {
			this.map.delete(includeNode.key);
		});
	}

	insertNodeIntoHead(node: TreeChainNode<Data>) {
		this.beforeInsertNode(node);
		node.insertInto(null, this.chain);
		this.afterInsertNode(node);
		return this;
	}

	/**
	 *
	 * @param node The node which will be inserted to chain
	 * @param target The target node as the inserting location
	 * @param isTargetChild When set to true, the node will insert to the child nodes of the target node. Default is false.
	 */
	insertNodeIntoTarget(
		node: TreeChainNode<Data>,
		target: TreeChainNode<Data>,
		isTargetChild = false
	) {
		this.beforeInsertNode(node);

		if (isTargetChild) {
			target.insertChild(node);
		} else {
			node.insertInto(target, target.siblingNextNode || null);
		}

		this.afterInsertNode(node);

		return this;
	}

	insertNodeByKey(node: TreeChainNode<Data>, key: PropertyKey, isTargetChild = false) {
		const target = this.findNodeByKey(key);
		if (!target) {
			this.insertNodeIntoHead(node);
		} else {
			this.insertNodeIntoTarget(node, target, isTargetChild);
		}
		return this;
	}

	deleteNode(node: TreeChainNode<Data>) {
		this.beforeDetachNode(node);
		node.detach();
		this.afterDetachNode(node);
		node.destroy();
		return this;
	}

	deleteNodeByKey(key: PropertyKey) {
		const target = this.findNodeByKey(key);

		if (!target) return this;

		return this.deleteNode(target);
	}

	moveNode(from: TreeChainNode<Data>, to: TreeChainNode<Data>, isTargetChild = false) {
		const cache = this.map;

		if (!cache.has(from.key)) {
			throw new Error(
				ERROR_PREFIX + `Can not find a node which key is \`${String(from.key)}\``
			);
		}
		if (!cache.has(to.key)) {
			throw new Error(
				ERROR_PREFIX + `Can not find a node which key is \`${String(to.key)}\``
			);
		}

		if (from.includeNodes.includes(to)) {
			throw new Error(ERROR_PREFIX + `Can not move a node to its children.`);
		}

		this.beforeDetachNode(from);
		from.detach();
		this.afterDetachNode(from);
		this.insertNodeIntoTarget(from, to, isTargetChild);
	}

	moveNodeByKey(fromKey: PropertyKey, toKey: PropertyKey, isTargetChild = false) {
		const from = this.findNodeByKey(fromKey);

		const to = this.findNodeByKey(toKey);

		if (!from) {
			throw new Error(
				ERROR_PREFIX + `Can not find a node which key is \`${String(fromKey)}\``
			);
		}

		if (!to) {
			throw new Error(ERROR_PREFIX + `Can not find a node which key is \`${String(toKey)}\``);
		}

		return this.moveNode(from, to, isTargetChild);
	}

	getNodesByLevel(level: number = 0) {
		let head = this.chain;
		let levelNodes: TreeChainNode<Data>[] = [head];
		let currentLevel = 0;

		while (head.siblingNextNode) {
			levelNodes.push(head.siblingNextNode);
			head = head.siblingNextNode;
		}

		function getNextLevelNodes(currentLevelNodes: TreeChainNode<Data>[]) {
			return currentLevelNodes.reduce((result, current) => {
				result.push(...current.childNodes);
				return result;
			}, [] as TreeChainNode<Data>[]);
		}

		while (currentLevel < level) {
			levelNodes = getNextLevelNodes(levelNodes);
			currentLevel++;
		}

		return levelNodes;
	}

	each(callback: (node: TreeChainNode<Data>) => false | void) {
		return TreeChain.eachChain(this.chain, callback);
	}

	findNodeByKey(key: PropertyKey) {
		return this.map.get(key);
	}

	toArray(config?: ConfigToArray<Data>) {
		const {
			filter,
			sort,
			startKey,
			keepAncestorsWithChildren = false,
			keepParentWithoutChildren = true,
			count = Infinity,
		} = config ?? {};

		const result: TreeChainNode<Data>[] = [];

		let head: TreeChainNode<Data> | undefined = this.chain;

		const filterCache = new WeakMap<TreeChainNode<Data>, boolean>();
		const withFilter = typeof filter === "function";

		const enhanceFilter = (node: TreeChainNode<Data>) => {
			if (!withFilter) return true;
			if (filterCache.has(node)) {
				return filterCache.get(node);
			}
			if (keepAncestorsWithChildren || !keepParentWithoutChildren) {
				const nodeIncludes = [...node.includeNodes].reverse();
				nodeIncludes.forEach((includeNode) => {
					if (includeNode.leaf) {
						filterCache.set(includeNode, !!filter.call(this, includeNode));
					} else {
						const isChildrenAllBeFiltered = includeNode.childNodes.every(
							(child) => filterCache.get(child) === false
						);
						if (isChildrenAllBeFiltered && !keepParentWithoutChildren) {
							filterCache.set(includeNode, false);
						} else if (!isChildrenAllBeFiltered && keepAncestorsWithChildren) {
							filterCache.set(includeNode, true);
						} else {
							filterCache.set(includeNode, !!filter.call(this, includeNode));
						}
					}
				});
				return filterCache.get(node);
			}
			const result = !!filter.call(this, node);
			filterCache.set(node, result);
			return result;
		};

		if (startKey) {
			const target = this.findNodeByKey(startKey);
			if (target) {
				head = target;
			}
		}

		while (!!head) {
			if (result.length >= count) break;

			if (withFilter) {
				const filterResult = enhanceFilter.call(this, head);

				if (!filterResult) {
					head = head.tail.nextNode;
					continue;
				}
			}

			result.push(head);
			head = head.nextNode;
		}

		if (typeof sort !== "undefined") {
			function getMark(node: TreeChainNode<Data>): PropertyKey[] {
				return node.parentNode ? [...getMark(node.parentNode), node.key] : [node.key];
			}

			function isSameMarkPrefix(markA: PropertyKey[], markB: PropertyKey[]) {
				if (markA.length !== markB.length) return false;
				return markA.every((key, index) => {
					if (index === markA.length - 1) return true;
					return markB[index] === key;
				});
			}

			function isMarkAPrefixMarkB(markA: PropertyKey[], markB: PropertyKey[]) {
				if (markA.length >= markB.length) return false;
				return markA.every((key, index) => {
					return markB[index] === key;
				});
			}

			const markMap = result.reduce((data, cur) => {
				const mark = getMark(cur);
				data.set(cur, mark);
				return data;
			}, new WeakMap<TreeChainNode<Data>, PropertyKey[]>());

			result.sort((nodeA, nodeB) => {
				const markA = markMap.get(nodeA)!;
				const markB = markMap.get(nodeB)!;

				if (isSameMarkPrefix(markA, markB)) {
					return sort.call(this, nodeA, nodeB);
				}
				if (isMarkAPrefixMarkB(markA, markB)) {
					return -1;
				}
				if (isMarkAPrefixMarkB(markB, markA)) {
					return 1;
				}
				return sort.call(this, nodeA, nodeB);
			});
		}

		return result;
	}

	static create<T extends CommonObject>(source: T[], config?: ConfigCreateTreeChain) {
		const { chain, map } = this.createTreeChain(source, config);

		const result = new TreeChain(chain);

		result._map = map;

		return result;
	}

	static createTreeChain<T extends CommonObject>(source: T[], config?: ConfigCreateTreeChain) {
		if (!Array.isArray(source) || source.length === 0) {
			throw new Error(ERROR_PREFIX + "Empty source data.");
		}

		const conf = Object.assign(
			{ ...DEFAULT_CONFIGCREATE },
			config ?? {}
		) as Required<ConfigCreateTreeChain>;

		const { childrenKey, dataKey } = conf;

		const map = new Map<PropertyKey, TreeChainNode<T>>();

		let cloned = [...source];

		const headKey = cloned[0][dataKey];

		let prevNode: TreeChainNode<T> | undefined;

		recurse(cloned, childrenKey, (data, index, parent) => {
			const parentNode = parent === void 0 ? void 0 : map.get(parent[dataKey]);

			const parentChildren = parent ? parent[childrenKey] : cloned;

			const siblingPrevNode =
				index === 0 ? void 0 : map.get(parentChildren[index - 1][dataKey]);

			const currentNode = new TreeChainNode<T>(data, dataKey);

			if (map.get(currentNode.key)) {
				throw new Error(ERROR_PREFIX + "Exists duplicated data key.");
			}

			map.set(currentNode.key, currentNode);

			if (parentNode) {
				currentNode.parentNode = parentNode;
				parentNode.childNodes.push(currentNode);
			}

			if (siblingPrevNode) {
				siblingPrevNode.siblingNextNode = currentNode;
				currentNode.siblingPrevNode = siblingPrevNode;
			}

			if (prevNode) {
				prevNode.nextNode = currentNode;
				currentNode.prevNode = prevNode;
			}

			prevNode = currentNode;
		});

		const headNode = map.get(headKey)!;

		return { chain: headNode, map };
	}

	static createTreeChainNode<T extends CommonObject>(source: T, config?: ConfigCreateTreeChain) {
		return TreeChain.createTreeChain([source], config).chain;
	}

	static findNodeByKeyFromChain(key: PropertyKey, chain: TreeChain<any>) {
		let head: TreeChainNode<any> | undefined = chain.chain;
		while (head) {
			if (head.key === key) return head;
			head = head.nextNode;
		}

		return head;
	}

	static eachChain<T extends CommonObject>(
		node: TreeChainNode<T>,
		callback: (node: TreeChainNode<T>) => false | void
	) {
		let head: TreeChainNode<any> | undefined = node;

		while (head) {
			const needBreak = callback(head);
			if (needBreak === false) break;
			head = head.nextNode;
		}

		return this;
	}

	static getTreeChainHeadByNode<T extends CommonObject>(
		node: TreeChainNode<T>
	): TreeChainNode<T> {
		let headNode: TreeChainNode<T> = node;

		while (headNode.prevNode || headNode.parentNode) {
			if (headNode.parentNode) {
				headNode = headNode.parentNode;
			} else if (headNode.prevNode) {
				headNode = headNode.prevNode;
			}
		}

		return headNode;
	}
}
