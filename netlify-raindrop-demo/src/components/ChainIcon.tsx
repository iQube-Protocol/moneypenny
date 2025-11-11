export default function ChainIcon({
  chain,
  className = "",
}: {
  chain: string;
  className?: string;
}) {
  const c = chain.toLowerCase();
  // Simple inline glyphs (swap later for your Aigent Z icon set)
  const map: Record<string, string> = {
    ethereum: "⚙️",
    arbitrum: "🧩",
    base: "🟦",
    polygon: "🔺",
    solana: "🟪",
    bitcoin: "₿",
  };
  const label = map[c] || "⛓️";
  return (
    <span
      className={`inline-flex items-center justify-center text-base ${className}`}
      title={chain}
    >
      {label}
    </span>
  );
}
