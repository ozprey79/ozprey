import { currentArchive, source } from './archive.server.js';

export function load() {
	return { ...currentArchive(), source };
}
