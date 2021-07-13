// Caches
type CacheableFunc = (...p: any) => any;
export function cacheIt(fn: CacheableFunc): CacheableFunc {
	const cache = {};
	setInterval(() => {
		Object.keys(cache).forEach((key) => {
			delete cache[key];
		});
	}, 1000 * 10); // reset cache every minute
	return (...p: any) => {
		const st = p.toString();
		let res = cache[st];
		if (res === undefined) {
			res = fn(...p);
			cache[st] = res;
		}
		return res;
	};
}
