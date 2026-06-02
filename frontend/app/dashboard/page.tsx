import { redirect } from 'next/navigation';

/** Legacy route: coach home is the client roster. */
export default function DashboardPage() {
  redirect('/clients');
}
