export interface TreeDataConfig {
	expandable: boolean;
	defaultExpandLevel: number;
	filterParent: boolean;
	defaultSort: ((a: any, b: any) => number) | null;
}
