import { SignupPage } from "./SignupPage";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return <SignupPage initialCode={code ?? ""} />;
}
