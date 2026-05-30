"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", emoji: "🏠" },
  { href: "/chat", label: "話す", emoji: "💬" },
  { href: "/records", label: "記録", emoji: "📊" },
  { href: "/knowledge", label: "情報", emoji: "📚" },
  { href: "/settings", label: "設定", emoji: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex z-50">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
            pathname === item.href
              ? "text-green-600 font-semibold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-xl leading-none mb-1">{item.emoji}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
