import { ReactNode } from "react";

export interface Column<Data> {
	width?: number;
	align?: "left" | "right" | "center";
	title?: string;
	dataIndex?: keyof Data;
	renderHeadNode?: () => ReactNode;
	renderNode?: (data: Data) => ReactNode;
	effect?: (container: ReactNode, update: () => any) => any;
}
