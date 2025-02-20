"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function ConnectWalletButton() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnect = () => {
    setWalletAddress("0x1234...abcd");
  };

  return walletAddress ? (
    <Link
      href={ROUTES.PROFILE}
      className="text-primary font-semibold hover:text-accent transition-colors"
    >
      {walletAddress}
    </Link>
  ) : (
    <Button variant="outline" onClick={handleConnect}>
      Connect Wallet
    </Button>
  );
}
