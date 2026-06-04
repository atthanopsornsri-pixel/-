import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f7] relative">
      <div className="w-full max-w-[480px] bg-white rounded-[32px] p-10 md:p-14 shadow-[0_8px_40px_rgb(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-500 m-4 relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
