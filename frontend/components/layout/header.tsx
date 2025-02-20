import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import Container from "@/components/ui/container";
import Logo from "@/components/shared/logo";
import ConnectWalletButton from "@/components/ui/connect-wallet-button";
import MobileMenu from "@/components/layout/mobile-menu";

export default function Header() {
  return (
    <header className="relative shadow-md min-h-[64px] z-20 bg-background flex align-center">
      <Container className="flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8 ml-auto mr-12 text-foreground text-base font-semibold">
          <Link href={ROUTES.HOME} className="hover:text-accent transition-colors">
            Home
          </Link>
          <Link href={ROUTES.ABOUT} className="hover:text-accent transition-colors">
            About
          </Link>
          <Link href={ROUTES.PROJECTS} className="hover:text-accent transition-colors">
            Projects
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-6">
          <ConnectWalletButton />
        </div>

        <MobileMenu />
      </Container>
    </header>
  );
}
