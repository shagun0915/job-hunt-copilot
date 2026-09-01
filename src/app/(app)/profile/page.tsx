import { PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile · Job Hunt Copilot" };

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div>
      <PageHeader
        title="Candidate profile"
        description="Facts the copilot must keep accurate when it writes résumé rewrites and outreach."
      />
      <ProfileForm profile={profile} />
    </div>
  );
}
