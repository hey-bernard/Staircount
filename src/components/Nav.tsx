import Link from "next/link";

const links = [
  { href: "/", label: "대시보드" },
  { href: "/workouts", label: "운동 기록" },
  { href: "/goals", label: "목표" },
  { href: "/coach", label: "AI 코치" },
];

export default function Nav() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          🏃 나만의 AI 운동 코치
        </Link>
        <nav className="flex gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 font-medium text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
