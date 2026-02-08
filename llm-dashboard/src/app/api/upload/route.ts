import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'src', 'data', 'results');

async function saveTestRun(data: any) {
  // Ensure results directory exists
  await mkdir(RESULTS_DIR, { recursive: true });

  // Save each run as an individual JSON file
  const timestamp = Date.now();
  const filename = `run_${timestamp}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  await writeFile(filepath, JSON.stringify({ id: timestamp, ...data }, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const data = JSON.parse(text);

    // Transform DeepEval output to include pipeline tracking
    const enrichedData = {
      date: new Date().toLocaleDateString(),
      fullDate: new Date().toLocaleString(),
      agent: data.test_case?.model || 'llama3.2:1b',
      judge: data.evaluation_model || 'gemini-1.5-flash',
      score: data.score || 0,
      reason: data.reason || '',
      sutOutput: data.test_case?.actual_output || '',
      metrics: data.metrics || null,

      pipeline: {
        deepeval_input: data.test_case?.input,

        ollama_request: {
          model: data.test_case?.model,
          prompt: data.test_case?.input,
          timestamp: data.timestamp,
        },
        ollama_response: {
          analysis: data.test_case?.actual_output,
          success: true,
        },
        ollama_metrics: data.metrics,

        gemini_request: {
          model: data.evaluation_model,
          prompt: `Evaluate: ${data.test_case?.actual_output}`,
          threshold: data.threshold,
        },
        gemini_response: {
          score: data.score,
          reason: data.reason,
          statements: data.statements,
        },
        gemini_metrics: {
          duration: data.evaluation_time,
        },

        deepeval_result: {
          score: data.score,
          status: data.score >= data.threshold ? 'PASSED' : 'FAILED',
          threshold: data.threshold,
          metric: 'Answer Relevancy',
        },
      },
    };

    await saveTestRun(enrichedData);

    return NextResponse.json({ success: true, id: Date.now() });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Optional: GET route to retrieve all saved test runs from results folder
export async function GET() {
  try {
    await mkdir(RESULTS_DIR, { recursive: true });
    const files = await readdir(RESULTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const results = await Promise.all(
      jsonFiles.map(async (filename) => {
        const content = await readFile(path.join(RESULTS_DIR, filename), 'utf-8');
        return JSON.parse(content);
      })
    );

    // Sort by id (timestamp) ascending
    results.sort((a, b) => (a.id || 0) - (b.id || 0));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}