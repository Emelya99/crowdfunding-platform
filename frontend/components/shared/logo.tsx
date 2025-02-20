import { ROUTES } from "@/constants/routes";
import Link from "next/link";
import { Rocket } from "lucide-react";

export default function Logo() {
  return (
    <Link
      href={ROUTES.HOME}
      className="flex items-center gap-3 text-primary text-2xl font-extrabold tracking-wide"
    >
      <Rocket className="h-6 w-6 text-accent" />
      <span className="text-primary">Crowdfunding</span>
    </Link>
  );
}
