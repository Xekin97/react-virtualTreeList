import styled from "styled-components";

export const VisualNodeWrapper = styled.div<{ nodeHeight: number; level: number }>`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: ${({ nodeHeight }) => (+nodeHeight || 40) + "px"};
	display: flex;
	align-items: center;
	box-shadow: 0 -1px 0 0 #ccc;
	box-sizing: border-box;
	cursor: pointer;
	font-size: 14px;
	.levelbox {
		width: ${({ level }) => level * 20 + "px"};
		flex-shrink: 0;
	}
	.tree-checkbox {
		width: 1.25em;
		height: 1.25em;
		cursor: pointer;
		display: block;
		position: relative;
		flex-shrink: 0;
		&::before {
			position: absolute;
			top: -13px;
			left: -5px;
			right: -5px;
			bottom: -13px;
			content: "";
		}
	}
	.value {
		position: relative;
		flex-grow: 1;
		.value-link {
			color: var(--logo-bgcolor);
		}
	}
	.action {
		display: none;
		height: 100%;
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		background-image: linear-gradient(to right, rgba(255, 255, 255, 0.3), #fff);
	}
	&:hover {
		background-color: #e6f5ff;
		.action {
			display: block;
		}
	}
`;

export const Capacity = styled.div`
	height: 100%;
	overflow-x: hidden;
`;

export const VisualWrapper = styled.div<{ height: number }>`
	height: ${({ height }) => height + "px"};
	position: relative;
	will-change: contents;
`;
