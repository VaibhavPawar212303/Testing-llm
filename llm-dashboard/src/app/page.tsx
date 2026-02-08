
import { loadAllResults } from '@/lib/load-results';
import ClientDashboard from './_components/ClientDashboard';


export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function DashboardPage() {
  const results = await loadAllResults();

  return <ClientDashboard realData={results} />;
}