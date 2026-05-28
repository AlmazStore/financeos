import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard/layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const profile = await db.onboardingProfile.findUnique({
    where: { userId: session.user.id },
    select: { isCompleted: true, tutorialDone: true },
  });

  if (!profile?.isCompleted) {
    redirect("/onboarding");
  }

  return (
    <DashboardLayout user={session.user ?? {}} showTutorial={!profile.tutorialDone}>
      {children}
    </DashboardLayout>
  );
}
