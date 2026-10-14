export default function LegacyTransferPage() { return null; }

export function getServerSideProps() {
  return { redirect: { destination: "/customizer", permanent: false } };
}
