export interface MiddlewarizerOptions {
	errorHandler?: (error: any, ...args: any[]) => any;
	muteNoNextCallWarning?: boolean;
	verbose?: boolean;
	name?: string;
}

export type Next = (error?) => true;

const middlewarizer = function (...args: any[]) {
	return (...funcs: Array<(next: Next, ...args) => any>) => async (
		options?: MiddlewarizerOptions
	) => {
		const verbose = (options && options.verbose) || process.env.NODE_ENV !== "production";
		let nextCallsNumber = 0;
		let nextError;
		let result;
		let name;
		if (options && typeof options.name !== "undefined") name = options.name;

		verbose &&
			name &&
			console.log(`Middlewarizer: About to start the middleware chain '${name}'...`);

		const next = (error?): true => {
			nextCallsNumber += 1;
			nextError = error;
			return true;
		};

		for (let i = 0; i < funcs.length; i++) {
			try {
				verbose &&
					console.log(
						`Middlewarizer: Exexuting the ${i + 1}th middleware '${funcs[i].name}'...`
					);
				result = await funcs[i](next, ...args);
			} catch (e) {
				return handleError(e, options || {}, verbose, funcs[i].name, ...args);
			}

			if (nextCallsNumber === 0) {
				if ((options && options.muteNoNextCallWarning) || i === funcs.length - 1)
					return doReturn(result, verbose, name);
				return console.warn(
					`Middlewarizer Warning: Next has not been called inside your ${
						i + 1
					}th function. You can mute this warning by setting 'muteNoNextCallWarning'`
				);
			} else if (nextCallsNumber > 1)
				throw new Error(
					`Middlewarizer Error: Next has been called more than once inside your ${
						i + 1
					}th function: ${funcs[i].name}`
				);

			if (typeof nextError !== "undefined")
				return handleError(nextError, options || {}, verbose, funcs[i].name, ...args);

			if (i === funcs.length - 1) return doReturn(result, verbose, name);
			nextCallsNumber = 0;
		}
	};
};

const doReturn = (value, verbose, name) => {
	verbose &&
		console.log(
			`Middlewarizer: ✅ '${name}' chain finished execution and returned with '${value}'`
		);
	return value;
};

const handleError = (
	error,
	options: MiddlewarizerOptions,
	verbose: boolean,
	name: string,
	...args
) => {
	verbose &&
		console.log(
			`Middlewarizer: 👎 Failed to pass middleware '${name}'. Stopped middleware stack.`
		);
	if (options && options.errorHandler) options.errorHandler(error, ...args);
	else throw new Error(error);
};

export default middlewarizer;
