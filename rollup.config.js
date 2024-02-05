// rollup.config.js
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const packageJson = require("./package.json");

const globals = {
	...packageJson.dependencies,
};

export default {
	input: "src/index.ts",
	external: Object.keys(globals),
	output: [
		{
			file: packageJson.main,
			format: "cjs", // commonJS
			sourcemap: true,
		},
		{
			file: packageJson.module,
			format: "esm", // ES Modules
			sourcemap: true,
		},
	],
	plugins: [
		json({
			include: ["node_modules/**"],
		}),
		typescript(),
		resolve(),
	],
};
