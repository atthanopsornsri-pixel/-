"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardButtonProps {
  label?: string;
  className?: string;
  href?: string;
}

export default function DashboardButton({ label = "ไปที่แดชบอร์ด", className, href = "/dashboard" }: DashboardButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNavigation = () => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Button 
      onClick={handleNavigation} 
      disabled={isPending}
      className={className || "rounded-full bg-slate-900 hover:bg-black text-white px-8 h-[44px] text-[15px] font-medium shadow-md transition-all w-fit min-w-[140px]"}
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isPending ? "กำลังโหลด..." : label}
    </Button>
  );
}
