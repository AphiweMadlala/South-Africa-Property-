// Gazetteer resolution tests. Inputs are synthetic strings, not account content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlace, PLACES } from '../scripts/lib/gazetteer.mjs';

test('place ids are unique', () => {
  const ids = PLACES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('location tag resolves to the most specific place', () => {
  const r = resolvePlace({ locationTag: 'Camps Bay, Cape Town, South Africa' });
  assert.equal(r.name, 'Camps Bay');
  assert.equal(r.city, 'Cape Town');
  assert.equal(r.province, 'Western Cape');
  assert.equal(r.source, 'location-tag');
  assert.equal(r.confidence, 'high');
});

test('an estate outranks its town', () => {
  const r = resolvePlace({ locationLines: ['Zimbali, Ballito'] });
  assert.equal(r.kind, 'estate');
  assert.equal(r.estate, 'Zimbali');
  assert.equal(r.city, 'Ballito');
  assert.equal(r.province, 'KwaZulu-Natal');
});

test('location tag beats caption text', () => {
  const r = resolvePlace({ locationTag: 'Umhlanga Rocks', caption: 'Inspired by homes in Clifton.' });
  assert.equal(r.name, 'Umhlanga');
  assert.equal(r.source, 'location-tag');
});

test('a shared name is disambiguated by another mention', () => {
  const r = resolvePlace({ caption: 'A family home in Morningside, Durban.' });
  assert.equal(r.name, 'Morningside');
  assert.equal(r.city, 'Durban');
  assert.equal(r.province, 'KwaZulu-Natal');
});

test('a shared name without context is low confidence', () => {
  const r = resolvePlace({ caption: 'Quiet street in Morningside.' });
  assert.equal(r.confidence, 'low');
});

test('an unambiguous alias of a shared place is not low confidence', () => {
  const r = resolvePlace({ caption: 'Views from Waterkloof Ridge.' });
  assert.equal(r.city, 'Pretoria');
  assert.equal(r.confidence, 'medium');
});

test('common words are not matched in free text', () => {
  assert.equal(resolvePlace({ caption: 'Lush gardens and a view of the wilderness.' }), null);
  const r = resolvePlace({ locationLines: ['Wilderness'] });
  assert.equal(r.name, 'Wilderness');
});

test('hashtags resolve at low confidence', () => {
  const r = resolvePlace({ hashtags: ['plettenbergbay', 'architecture'] });
  assert.equal(r.name, 'Plettenberg Bay');
  assert.equal(r.confidence, 'low');
});

test('short uppercase aliases need exact case', () => {
  assert.equal(resolvePlace({ caption: 'a sa' }), null);
  assert.equal(resolvePlace({ caption: 'Designed in CPT' }).name, 'Cape Town');
});

test('curly apostrophes normalise', () => {
  assert.equal(resolvePlace({ locationLines: ['Simon’s Town'] }).name, "Simon's Town");
});

test('places outside South Africa carry their country', () => {
  const r = resolvePlace({ locationTag: 'Swakopmund, Namibia' });
  assert.equal(r.country, 'Namibia');
  assert.equal(r.province, null);
});

test('conflicting places in different cities lower confidence', () => {
  const r = resolvePlace({ caption: 'From Clifton to Umhlanga, three homes this week.' });
  assert.equal(r.confidence, 'low');
  assert.ok(r.notes.some((n) => n.startsWith('also mentions')));
});
