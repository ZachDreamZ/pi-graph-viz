module.exports = {
	testEnvironment: "node",
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
				diagnostics: {
					ignoreCodes: [151001],
				},
			},
		],
	},
	testMatch: ["**/tests/**/*.test.ts"],
	moduleFileExtensions: ["ts", "js", "json"],
};
