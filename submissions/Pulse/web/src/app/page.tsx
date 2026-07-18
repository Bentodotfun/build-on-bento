import { DeckFlow } from "@/components/DeckFlow";
import { Onboarding } from "@/components/Onboarding";

export default function Home() {
  return (
    <main className="min-h-dvh w-full">
      <Onboarding />
      <DeckFlow />
    </main>
  );
}
