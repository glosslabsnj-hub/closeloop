import { BRAND } from "@/config/brand";

export function BlueprintHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="text-center py-16 border-b print:py-24 print:border-b-2 print:border-black">
      <h1 className="text-5xl font-bold mb-4 print:text-6xl">{BRAND.name}</h1>
      <p className="text-2xl text-muted-foreground mb-2 print:text-black">
        Platform Blueprint
      </p>
      <p className="text-lg text-muted-foreground italic print:text-gray-600">
        {BRAND.tagline}
      </p>
      <div className="mt-8 text-sm text-muted-foreground space-y-1 print:text-gray-500">
        <p>Generated {today}</p>
        <p>Auto-generated from live codebase — always up to date</p>
      </div>
    </div>
  );
}
