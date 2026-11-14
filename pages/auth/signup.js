/** /auth/signup → /auth?mode=signup (menjaga parameter next). */
import { safeNext } from '@/src/lib/safeNext';

export async function getServerSideProps({ query }) {
  const params = new URLSearchParams({ mode: 'signup' });
  if (query.next) params.set('next', safeNext(query.next, '/'));
  return { redirect: { destination: `/auth?${params.toString()}`, permanent: false } };
}

export default function SignupRedirect() {
  return null;
}
