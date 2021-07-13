export async function fetchJson(url: RequestInfo) {
	console.log(url);
	const req = await fetch(url, { mode: 'cors' }); // json loader helper
	return req.json();
}
