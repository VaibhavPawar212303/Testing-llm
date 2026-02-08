import { readFile, readdir, mkdir } from 'fs/promises';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'src', 'data', 'results');

export async function loadAllResults() {
  try {
    await mkdir(RESULTS_DIR, { recursive: true });
    const files = await readdir(RESULTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const results = await Promise.all(
      jsonFiles.map(async (filename) => {
        try {
          const content = await readFile(path.join(RESULTS_DIR, filename), 'utf-8');
          return JSON.parse(content);
        } catch (err) {
          console.error(`Failed to parse ${filename}:`, err);
          return null;
        }
      })
    );

    // Filter out failed parses, sort by id (timestamp) ascending
    return results
      .filter(Boolean)
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  } catch {
    return [];
  }
}