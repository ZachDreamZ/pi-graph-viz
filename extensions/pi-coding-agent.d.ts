declare module "pi-coding-agent" {
	export interface ExtensionAPI {
		on(event: string, handler: Function): void;
		registerTool<TDetails = unknown>(tool: ToolDefinition<TDetails>): void;
		registerCommand(
			name: string,
			options: {
				description?: string;
				handler: (args: string, ctx: any) => Promise<void> | void;
			},
		): void;
	}

	export interface ToolDefinition<TDetails = unknown> {
		name: string;
		label: string;
		description: string;
		parameters: any;
		execute(
			params: any,
			signal: AbortSignal | undefined,
			onUpdate: ((update: any) => void) | undefined,
			ctx: any,
		): Promise<{ type: "text"; content: string; isError?: boolean }>;
	}

	export interface ExtensionCommandContext {
		cwd: string;
		ui: any;
	}
}
