export interface EvaluationRun {
    id: string;
    timestamp: string;
    score: number;
    status: 'High' | 'Medium' | 'Low';
    sutOutput: string;
    judgeReason: string;
    agent: string;
  }
  
  export function getClientFriendlyStatus(score: number) {
    if (score >= 0.8) return { label: 'High Reliability', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 0.6) return { label: 'Medium Reliability', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Needs Optimization', color: 'text-red-600', bg: 'bg-red-50' };
  }