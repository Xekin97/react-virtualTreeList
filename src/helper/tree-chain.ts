import { ERROR_PREFIX } from "../constants";
import { recurse } from "../utils";

type CommonObject = Record<PropertyKey, any>;

export interface TreeChainNode<T extends CommonObject = any> {
	key: PropertyKey;
	source: T;
	isLeaf: boolean;
	parentNode?: TreeChainNode<T>;
	prevNode?: TreeChainNode<T>;
	nextNode?: TreeChainNode<T>;
	siblingNode?: TreeChainNode<T>;
	children?: TreeChainNode<T>[];
}

export interface TreeChainDetail<T extends CommonObject> {
	keys: PropertyKey[];
	nodes: TreeChainNode<T>[];
	siblingNodes: TreeChainNode<T>[];
	tailNode: TreeChainNode<T>;
	topNode: TreeChainNode<T>;
	map: Map<PropertyKey, TreeChainNode<T>>;
}

export interface ConfigCreateTreeChain {
	childrenKey?: PropertyKey;
	dataKey?: PropertyKey;
}

type SortFn<Data extends CommonObject> = (a: TreeChainNode<Data>, b: TreeChainNode<Data>) => number;

type FilterFn<Data extends CommonObject> = (data: TreeChainNode<Data>) => boolean;

export interface ConfigToArray<Data extends CommonObject> {
	filter?: FilterFn<Data>;
	sort?: SortFn<Data>;
	area?: {
		key: PropertyKey;
		count: number;
	};
}

const DEFAULT_CONFIGCREATE: ConfigCreateTreeChain = {
	dataKey: "id",
	childrenKey: "children",
};

function isPropertyKey(key: any): key is PropertyKey {
	return typeof key === "string" || !Number.isNaN(key) || typeof key === "symbol";
}

export class TreeChain<Data extends CommonObject> {
	dataKey: PropertyKey = "id";

	childrenKey: PropertyKey = "children";

	protected source: Data[] = [];

	protected map: Map<PropertyKey, TreeChainNode<Data>> = new Map();

	get chain() {
		return this._chain;
	}

	constructor(protected _chain: TreeChainNode<Data>) {}

	insertNodeToChain(node: TreeChainNode<Data>, key?: PropertyKey) {
		const { tailNode, nodes } = TreeChain.getChainDetail(node);

		const target = this.findNodeByKey(key);

		if (target) {
			const nextNodeOfTarget = target.nextNode;
			target.nextNode = node;
			tailNode.nextNode = nextNodeOfTarget;
			node.siblingNode = nextNodeOfTarget;
			node.parentNode = target.parentNode;
			node.prevNode = target;
			node.isLeaf = !!node.children?.length;
		} else {
			const thisHead = this.chain;
			node.parentNode = void 0;
			node.prevNode = void 0;
			node.siblingNode = thisHead;
			node.isLeaf = !!node.children?.length;
			tailNode.nextNode = thisHead;
			thisHead.prevNode = tailNode;
		}

		nodes.forEach((node) => this.map.set(node.key, node));
	}

	deleteNodeFromChain(key: PropertyKey) {
		const target = this.findNodeByKey(key);

		if (!target) return;

		const { keys, tailNode, siblingNodes } = TreeChain.getChainDetail(target);

		const prevNode = target.prevNode;

		const nextNode = tailNode.nextNode;

		let siblingNode = target.siblingNode;

		const prevSiblingNode = siblingNodes.find((node) => node.siblingNode === target);

		if (prevSiblingNode) {
			prevSiblingNode.siblingNode = siblingNode;
		}

		if (prevNode) {
			prevNode.nextNode = nextNode;
		}

		keys.forEach((key) => this.map.delete(key));
	}

	getNodesByLevel(level: number = 0) {
		let LevelNodes: TreeChainNode<Data>[] = [];

		let head: TreeChainNode<Data> | undefined = this.chain;

		while (head) {
			LevelNodes.push(head);
			head = head.siblingNode;
		}

		if (!level) {
			return LevelNodes;
		}

		let count = 0;

		while (count < level) {
			count++;

			LevelNodes = LevelNodes.reduce((nodes, current) => {
				nodes.push(...(current.children ?? []));
				return nodes;
			}, [] as TreeChainNode<Data>[]);
		}

		return LevelNodes;
	}

	each(callback: (node: TreeChainNode<Data>) => false | void) {
		return TreeChain.eachNode(this.chain, callback);
	}

	findNodeByKey(key?: PropertyKey) {
		if (!key) return;
		return this.map.get(key);
	}

	toArray(config?: ConfigToArray<Data>) {
		const { filter, sort, area } = config ?? {};

		const result: TreeChainNode<Data>[] = [];

		let head: TreeChainNode<Data> | undefined = this.chain;
		let count = 0;

		if (area) {
			const { key } = area;
			head = this.findNodeByKey(key);
		}

		while (!!head) {
			if (area?.count && count >= area.count) break;
			if (typeof filter === "function" && !filter.call(this, head)) {
				head = head.siblingNode;
			} else {
				result.push(head);
				head = head.nextNode;
				count++;
			}
		}

		if (typeof sort !== "undefined") {
			result.sort((a, b) => {
				if (a.parentNode === b) {
					return 1;
				}
				if (b.parentNode === a) {
					return -1;
				}
				if (a.parentNode === b.parentNode) {
					return sort.call(this, a, b);
				}
				return 0;
			});
		}

		return result;
	}

	cloneSelf() {
		const chain = TreeChain.clone(this.chain);

		chain.source = this.source;

		chain.map = new Map(this.map);

		return chain;
	}

	static create<T extends CommonObject>(source: T[], config?: ConfigCreateTreeChain) {
		const conf = Object.assign(
			DEFAULT_CONFIGCREATE,
			config ?? {}
		) as Required<ConfigCreateTreeChain>;

		const { childrenKey, dataKey } = conf;

		let cloned = [...source];

		const map = new Map<PropertyKey, TreeChainNode<T>>();

		let head: TreeChainNode<T> | undefined;
		let prevNode: TreeChainNode<T> | undefined;

		recurse(cloned, childrenKey, (data, index, parent) => {
			const parentNode = parent === void 0 ? void 0 : map.get(parent[dataKey]);
			const currentNode = TreeChain.createTreeChainNode(
				data,
				dataKey,
				childrenKey,
				parentNode,
				void 0,
				prevNode
			);
			map.set(currentNode.key, currentNode);

			const siblingData =
				parent === void 0 ? cloned[index - 1] : parent[childrenKey][index - 1];

			if (siblingData) {
				const siblingNode = map.get(siblingData[dataKey]);
				if (siblingNode) {
					siblingNode.siblingNode = currentNode;
				}
			}

			if (parentNode) {
				Array.isArray(parentNode.children)
					? parentNode.children.push(currentNode)
					: (parentNode.children = [currentNode]);
			}

			if (!head) {
				head = currentNode;
			}

			if (prevNode) {
				prevNode.nextNode = currentNode;
			}

			prevNode = currentNode;
		});

		if (!head)
			throw new Error(
				ERROR_PREFIX + "Failed to create tree train, please check data and keys"
			);

		const chain = new TreeChain<T>(head);

		chain.source = source;

		chain.map = map;

		return chain;
	}

	static createTreeChainNode<T extends CommonObject>(
		data: T,
		dataKey: keyof T,
		childrenKey: keyof T,
		parent?: TreeChainNode<T>,
		sibling?: TreeChainNode<T>,
		prev?: TreeChainNode<T>,
		next?: TreeChainNode<T>
	): TreeChainNode<T> {
		if (!isPropertyKey(dataKey))
			throw new Error(ERROR_PREFIX + `Invalid key "${String(dataKey)}" in data.`);
		if (!isPropertyKey(childrenKey))
			throw new Error(
				ERROR_PREFIX + `Invalid key "${String(childrenKey)}" for children in data.`
			);

		const children = data[childrenKey];

		return {
			key: data[dataKey],
			source: data,
			parentNode: parent,
			siblingNode: sibling,
			prevNode: prev,
			nextNode: next,
			isLeaf: Array.isArray(children) && children.length !== 0,
			children: [],
		};
	}

	static clone<T extends CommonObject>(topNode: TreeChainNode<T>) {
		let head: TreeChainNode<T> | undefined = topNode;
		let cloned: TreeChainNode<T> | undefined = { ...topNode };
		while (head) {
			const next = topNode.nextNode;
			if (next) {
				cloned.nextNode = { ...next };
			}
			head = next;
		}

		if (!head) {
			throw new Error(ERROR_PREFIX + "Never init.");
		}

		return new TreeChain<T>(head);
	}

	static findNodeByKeyFromChain(key: PropertyKey, topNode: TreeChainNode<any>) {
		let head: TreeChainNode<any> | undefined = topNode;
		while (head) {
			if (head.key === key) return head;
			head = head.nextNode;
		}
	}

	static eachNode<T extends CommonObject>(
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

	static getTopNodeOfTreeChain<T extends CommonObject>(
		chain: TreeChainNode<T>
	): TreeChainNode<T> {
		let topNode: TreeChainNode<T> = chain;

		while (topNode.prevNode || topNode.parentNode) {
			if (topNode.parentNode) {
				topNode = topNode.parentNode;
			}
			if (topNode.prevNode) {
				topNode = topNode.prevNode;
			}
		}

		return topNode;
	}

	static getChainDetail<T extends CommonObject>(chain: TreeChainNode<T>): TreeChainDetail<T> {
		let keys: PropertyKey[] = [];
		let nodes: TreeChainNode<T>[] = [];
		let map: Map<PropertyKey, TreeChainNode<T>> = new Map();
		let current = chain;

		TreeChain.eachNode(chain, (node) => {
			nodes.push(node);
			keys.push(node.key);
			current = node;
			map.set(node.key, node);
		});

		let siblingNodes: TreeChainNode<T>[] = [];

		const topNode = TreeChain.getTopNodeOfTreeChain(chain);

		if (!!chain.parentNode) {
			siblingNodes = chain.parentNode.children!;
		} else {
			let head: TreeChainNode<T> | undefined = topNode;
			while (head) {
				siblingNodes.push(head);
				head = chain.siblingNode;
			}
		}

		return {
			keys,
			nodes,
			topNode,
			tailNode: current,
			siblingNodes,
			map,
		};
	}
}
