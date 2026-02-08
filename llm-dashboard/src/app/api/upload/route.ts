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
    const buildData = JSON.parse(text);

    // Extract pipeline data from build result structure
    const sutData = buildData.pipeline?.student_sut || {};
    const judgeData = buildData.pipeline?.teacher_judge || {};
    const analyticsData = buildData.pipeline?.deepeval_analytics?.[0] || {};
    const envData = buildData.environment || {};

    // Transform build result to frontend format
    const enrichedData = {
      // Basic info
      date: new Date().toLocaleDateString(),
      fullDate: new Date().toLocaleString(),
      buildId: buildData.build_id,
      timestamp: buildData.timestamp,
      overallStatus: buildData.overall_status,

      // Agent (SUT) info
      agent: sutData.model || 'llama3.2:1b',
      agentDuration: sutData.duration_seconds || 0,
      
      // Judge info
      judge: judgeData.model || 'gemini',
      judgeDuration: judgeData.duration_seconds || 0,

      // Scores and evaluation
      score: analyticsData.score || 0,
      threshold: analyticsData.threshold || 0.6,
      passed: analyticsData.passed || false,
      reason: analyticsData.reason || '',
      metricName: analyticsData.metric_name || 'AnswerRelevancyMetric',
      error: analyticsData.error || null,

      // SUT Output
      sutOutput: sutData.response || '',
      sutPrompt: sutData.prompt || '',

      // Judge Output
      judgeOutput: judgeData.response || '',
      judgePrompt: judgeData.prompt || '',

      // Statements and Verdicts
      statements: analyticsData.pipeline_flow?.judge_statements || [],
      verdicts: analyticsData.pipeline_flow?.judge_verdicts || [],

      // Hardware metrics
      metrics: sutData.metrics || null,
      judgeMetrics: judgeData.metrics || {},

      // Complete pipeline breakdown
      pipeline: {
        // 1. SUT (Student) Phase
        sut_phase: {
          model: sutData.model,
          prompt: sutData.prompt,
          response: sutData.response,
          duration_seconds: sutData.duration_seconds,
          metrics: sutData.metrics,
          thought_process: sutData.thought_process || '',
        },

        // 2. Judge (Teacher) Phase
        judge_phase: {
          model: judgeData.model,
          prompt: judgeData.prompt,
          response: judgeData.response,
          duration_seconds: judgeData.duration_seconds,
          metrics: judgeData.metrics,
        },

        // 3. DeepEval Analytics Phase
        deepeval_phase: {
          metric_name: analyticsData.metric_name,
          score: analyticsData.score,
          threshold: analyticsData.threshold,
          passed: analyticsData.passed,
          reason: analyticsData.reason,
          success: analyticsData.success,
          error: analyticsData.error,
          
          // Pipeline flow details
          statements: analyticsData.pipeline_flow?.judge_statements || [],
          verdicts: analyticsData.pipeline_flow?.judge_verdicts || [],
          
          // Verdict breakdown
          verdict_breakdown: {
            yes: analyticsData.pipeline_flow?.judge_verdicts?.filter((v: any) => v.verdict === 'yes').length || 0,
            no: analyticsData.pipeline_flow?.judge_verdicts?.filter((v: any) => v.verdict === 'no').length || 0,
            idk: analyticsData.pipeline_flow?.judge_verdicts?.filter((v: any) => v.verdict === 'idk').length || 0,
            total: analyticsData.pipeline_flow?.judge_verdicts?.length || 0,
          },
        },

        // 4. Environment info
        environment: {
          os: envData.os,
          sut_hardware: envData.sut_hardware,
        },
      },

      // Raw build data for reference
      raw_build: buildData,
    };

    await saveTestRun(enrichedData);

    return NextResponse.json({ 
      success: true, 
      id: Date.now(),
      buildId: buildData.build_id,
      status: buildData.overall_status,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET route to retrieve all saved test runs from results folder
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

    // Sort by id (timestamp) descending - newest first
    results.sort((a, b) => (b.id || 0) - (a.id || 0));

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json([]);
  }
}