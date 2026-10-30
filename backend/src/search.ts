import { Client } from '@elastic/elasticsearch';
import { config } from './config';
const es = new Client({ node: config.esUrl });

export async function indexEmail(e: Record<string, any>) {
  try {
    await es.index({ index: 'emails', id: e.id, document: e });
  } catch (err: any) { console.warn('ES index failed:', err.message); }
}

export async function searchEmails(userId: string, q: string) {
  const r = await es.search({
    index: 'emails', size: 50,
    query: { bool: {
      filter: [{ term: { 'user_id.keyword': userId } }],
      must: q ? [{ multi_match: { query: q, fields: ['to_email', 'subject', 'body'], fuzziness: 'AUTO' } }] : [{ match_all: {} }],
    } },
  });
  return r.hits.hits.map((h) => h._source);
}
