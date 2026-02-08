import fs from 'fs';
import path from 'path';

export async function getRealEvalData() {
  const resultsPath = path.join(process.cwd(), 'src/data/results');
  
  if (!fs.existsSync(resultsPath)) return [];

  const files = fs.readdirSync(resultsPath).filter(f => !f.startsWith('.'));

  const allData = files.map(file => {
    try {
      const raw = fs.readFileSync(path.join(resultsPath, file), 'utf-8');
      const json = JSON.parse(raw);
      const tc = json.testCases[0];
      const m = tc.metricsData[0];

      // Filename example: 20260207_145459.json
      const datePart = file.split('_')[0]; 
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);

      return {
        date: new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: new Date(`${year}-${month}-${day}`).toLocaleString(),
        timestamp: new Date(`${year}-${month}-${day}`).getTime(),
        score: m.score,
        reason: m.reason,
        sutOutput: tc.actualOutput,
        agent: "qwen3:4b (Thinking)",
        judge: m.evaluationModel || "Gemini 2.5 Flash"
      };
    } catch (e) { return null; }
  }).filter(Boolean);

  return allData.sort((a: any, b: any) => a.timestamp - b.timestamp);
}