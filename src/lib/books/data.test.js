import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBooks, readingStats, authorCounts } from './data.js';
import { fetchLibrary } from './hardcover.server.js';

const row = (id, extra = {}) => ({
	privacy_setting_id: 1, status_id: 3, rating: null,
	book: { id, title: `Book ${id}`, slug: `book-${id}`, pages: 250, release_year: 1999,
		cached_image: { url: 'https://assets.hardcover.app/cover.jpg' },
		cached_contributors: [{ author: {name:'Author'}, contributor_role_id:1 }, {author:{name:'Translator'},contributor_role_id:2}],
		cached_tags: {Genre:[{tag:'Fiction'},{tag:'Fiction'}]} },
	...extra
});

test('library normalization respects public entries, editions, roles, and missing data', () => {
	const books = normalizeBooks([row(1, {edition:{pages:300},user_book_reads:[{finished_at:'2025-01-02'},{finished_at:'2026-01-01'}]}), row(2,{privacy_setting_id:2}),row(3,{book:{id:3,title:'അക്ഷരം',pages:null,cached_image:{url:'javascript:bad()'}}})]);
	assert.equal(books.length,2);
	assert.equal(books[0].pages,300);
	assert.deepEqual(books[0].authors,['Author']);
	assert.deepEqual(books[0].genres,['Fiction']);
	assert.equal(books[0].rating,null);
	assert.equal(books[0].finishedDate,'2026-01-01');
	assert.equal(books[1].cover,null);
	assert.equal(books[1].pages,null);
	assert.equal(books[1].finishedDate,null,'Never substitute date added for date read');
});

test('totals count completed books and known pages, keeping current reads separate', () => {
	const books=normalizeBooks([row(1),row(2,{status_id:2}),row(3,{book:{id:3,pages:null}})]);
	assert.deepEqual(readingStats(books),{read:2,pages:250,authors:1,reading:1,missingPages:1});
	assert.deepEqual(authorCounts(books),[{name:'Author',count:2}]);
	assert.equal(normalizeBooks([row(1),row(1)]).length,1);
});

test('Hardcover loader paginates, keeps the token in the request header, and accepts a Bearer prefix', async () => {
	let calls=0;
	const result=await fetchLibrary(async (url, options) => {
		assert.equal(url,'https://api.hardcover.app/v1/graphql');
		assert.equal(options.headers.Authorization,'Bearer test-token');
		const body=JSON.parse(options.body);
		assert.equal(body.variables.username,'reader');
		assert.equal(body.variables.offset,calls*100);
		assert.match(body.query,/privacy_setting_id: \{_eq: 1\}/);
		calls++;
		return Response.json({data:{user_books:calls===1?Array.from({length:100},(_,i)=>row(i+1)):[row(101)]}});
	},'Bearer test-token','reader');
	assert.equal(calls,2);
	assert.equal(result.books.length,101);
	assert.equal(result.username,'reader');
	assert.ok(!JSON.stringify(result).includes('test-token'));
});

test('Hardcover HTTP and GraphQL errors do not masquerade as empty collections', async () => {
	await assert.rejects(()=>fetchLibrary(async()=>new Response('',{status:403}),'test','reader'),/403/);
	await assert.rejects(()=>fetchLibrary(async()=>Response.json({errors:[{message:'Unavailable'}]}),'test','reader'),/unavailable/);
	const empty=await fetchLibrary(async()=>Response.json({data:{user_books:[]}}),'test','reader');
	assert.deepEqual(empty.books,[]);
});
