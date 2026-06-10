/**
 * SWR fetcher utilities
 * ใช้เป็น 2nd argument ของ useSWR() เพื่อ cache + stale-while-revalidate
 */

/** JSON fetcher สำหรับ API routes (/api/...) */
export const jsonFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Fetch error ${r.status}: ${url}`);
    return r.json();
  });
