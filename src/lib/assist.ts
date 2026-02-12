import { prisma } from "@/lib/prisma";
import { ASSIST_SCENARIOS } from "@/lib/assistScenarios";

export type RecommendInput = {
  scenarioId: string;
  // attribute value slugs selected by user, e.g. ["oily", "acne", "bha"]
  valueSlugs: string[];
  limit?: number;
};

export type RecommendReason = {
  score: number;
  matched: {
    skin: string[];
    goals: string[];
    actives: string[];
  };
};

export type RecommendItem = {
  id: number;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  brandName: string | null;
  reason: RecommendReason;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function clampInt(n: unknown, def: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

export async function recommendProducts(input: RecommendInput): Promise<RecommendItem[]> {
  const scenario = ASSIST_SCENARIOS.find((s) => s.id === input.scenarioId);
  if (!scenario) return [];

  const limit = clampInt(input.limit, 12, 1, 50);
  const selectedSlugs = uniq((input.valueSlugs || []).map((s) => String(s).trim()).filter(Boolean));
  if (selectedSlugs.length === 0) {
    // no answers -> just return newest active products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        brand: true,
        attributes: { include: { value: { include: { group: true } } } },
      },
    });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      imageUrl: p.imageUrl ?? null,
      brandName: (p as any).brand?.name ?? null,
      reason: { score: 0, matched: { skin: [], goals: [], actives: [] } },
    }));
  }

  // resolve selected AttributeValue IDs + group slugs
  const selectedValues = await prisma.attributeValue.findMany({
    where: {
      slug: { in: selectedSlugs },
      group: { slug: { in: scenario.groups } },
    },
    include: { group: true },
  });

  const selectedByGroup = {
    "skin-type": selectedValues.filter((v) => v.group.slug === "skin-type"),
    goals: selectedValues.filter((v) => v.group.slug === "goals"),
    actives: selectedValues.filter((v) => v.group.slug === "actives"),
  };

  const selectedIds = selectedValues.map((v) => v.id);
  if (selectedIds.length === 0) {
    return [];
  }

  // pull candidates: products having at least one of selected values
  const candidates = await prisma.product.findMany({
    where: {
      isActive: true,
      attributes: {
        some: {
          valueId: { in: selectedIds },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200, // score then cut
    include: {
      brand: true,
      attributes: { include: { value: { include: { group: true } } } },
    },
  });

  const scored = candidates
    .map((p) => {
      const vals = (p as any).attributes?.map((a: any) => a.value).filter(Boolean) ?? [];
      const skin = vals.filter((v: any) => v.group?.slug === "skin-type").map((v: any) => v.slug);
      const goals = vals.filter((v: any) => v.group?.slug === "goals").map((v: any) => v.slug);
      const actives = vals.filter((v: any) => v.group?.slug === "actives").map((v: any) => v.slug);

      const skinSel = new Set(selectedByGroup["skin-type"].map((v) => v.slug));
      const goalsSel = new Set(selectedByGroup.goals.map((v) => v.slug));
      const activesSel = new Set(selectedByGroup.actives.map((v) => v.slug));

      const skinMatched = skin.filter((s: string) => skinSel.has(s));
      const goalsMatched = goals.filter((s: string) => goalsSel.has(s));
      const activesMatched = actives.filter((s: string) => activesSel.has(s));

      // weights (safe defaults; tweak later)
      const score =
        skinMatched.length * 5 +
        goalsMatched.length * 8 +
        activesMatched.length * 3;

      return {
        p,
        score,
        matched: {
          skin: uniq(skinMatched),
          goals: uniq(goalsMatched),
          actives: uniq(activesMatched),
        },
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => ({
    id: x.p.id,
    name: x.p.name,
    slug: x.p.slug,
    price: x.p.price,
    oldPrice: x.p.oldPrice ?? null,
    imageUrl: x.p.imageUrl ?? null,
    brandName: (x.p as any).brand?.name ?? null,
    reason: { score: x.score, matched: x.matched },
  }));
}

