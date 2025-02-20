"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Menu, X } from "lucide-react";
import ConnectWalletButton from "@/components/ui/connect-wallet-button";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button className="p-2" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-md">
          <nav className="flex flex-col items-center gap-4 py-4 text-foreground text-lg font-semibold">
            <Link
              href={ROUTES.HOME}
              className="hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href={ROUTES.ABOUT}
              className="hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              href={ROUTES.PROJECTS}
              className="hover:text-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Projects
            </Link>

            <div className="pt-2" onClick={() => setIsOpen(false)}>
              <ConnectWalletButton />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
