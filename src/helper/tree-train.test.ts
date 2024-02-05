import { describe, expect } from "@jest/globals";
import { TreeChain, TreeChainNode } from "./tree-chain";

interface Data {
	id: number;
	name: string;
	children?: Data[];
}

const MOCK_DATA: Data[] = [
	{
		id: 0,
		name: "tom",
		children: [
			{
				id: 1,
				name: "jerry",
			},
			{
				id: 2,
				name: "john",
			},
		],
	},
	{
		id: 3,
		name: "halo",
		children: [
			{
				id: 4,
				name: "rox",
				children: [
					{
						id: 5,
						name: "holy",
						children: [
							{
								id: 6,
								name: "xekin",
							},
						],
					},
					{
						id: 7,
						name: "siri",
					},
					{
						id: 8,
						name: "san",
					},
					{
						id: 9,
						name: "dan",
						children: [
							{
								id: 10,
								name: "danny",
							},
							{
								id: 11,
								name: "ally",
							},
						],
					},
				],
			},
			{
				id: 12,
				name: "neo",
			},
		],
	},
	{
		id: 13,
		name: "belly",
	},
];

describe("test tree chain", () => {
	const treeChain = TreeChain.create(MOCK_DATA);
	const head = treeChain.chain;

	test("create tree chain", () => {
		expect(Array.isArray(head.children)).toBe(true);
		expect((head.children as any[]).length).toBe(2);
		expect(head.key).toBe(0);
		expect(head.nextNode?.key).toBe(1);
		expect(head.siblingNode?.key).toBe(3);
		expect(head.siblingNode?.siblingNode?.key).toBe(13);
		expect((head.children as any[])[0] === head?.nextNode).toBe(true);

		const MOCK_KEYS_SET = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

		let length = 1;
		let lastNode: TreeChainNode<Data> | undefined = head;
		while (lastNode?.nextNode) {
			length++;
			lastNode = lastNode.nextNode;
			MOCK_KEYS_SET.delete(Number(lastNode.key));
		}

		expect(MOCK_KEYS_SET.size).toBe(0);
		expect(lastNode?.key).toBe(13);
		expect(lastNode?.prevNode?.key).toBe(12);

		expect(head?.nextNode?.parentNode === head).toBe(true);
		expect(length).toBe(14);
	});

	test("find node", () => {
		const node = treeChain.findNodeByKey(8);

		expect(node?.source.name).toBe("san");
		expect(node?.nextNode?.key).toBe(9);
		expect(node?.siblingNode?.key).toBe(9);
	});

	test("get nodes by level", () => {
		const level0Nodes = treeChain.getNodesByLevel();

		expect(level0Nodes.length).toBe(3);
		expect(level0Nodes[0].key).toBe(0);
		expect(level0Nodes[1].key).toBe(3);
		expect(level0Nodes[2].key).toBe(13);

		const level1Nodes = treeChain.getNodesByLevel(1);

		expect(level1Nodes.length).toBe(4);
		expect(level1Nodes[0].key).toBe(1);
		expect(level1Nodes[1].key).toBe(2);
		expect(level1Nodes[2].key).toBe(4);
		expect(level1Nodes[3].key).toBe(12);
	});
});
