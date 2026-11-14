import Seo from '@/components/Seo';
import Playground from '@/components/playground/Playground';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function getServerSideProps(context) {
  let session = null;
  try {
    session = await getServerSession(context.req, context.res, authOptions);
  } catch {}

  if (!session?.user) {
    return { redirect: { destination: '/auth?next=%2Fplayground', permanent: false } };
  }
  return { props: {} };
}

export default function PlaygroundPage() {
  return (
    <>
      <Seo title="API Playground" />
      <Playground />
    </>
  );
}
