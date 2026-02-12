export type AssistScenario = {
  id: string;
  title: string;
  description?: string;
  // optional fixed filters (can expand later)
  preferredCategorySlugs?: string[];
  preferredBrandSlugs?: string[];
  // which attribute groups we care about (by slug)
  groups: Array<"skin-type" | "goals" | "actives">;
};

export const ASSIST_SCENARIOS: AssistScenario[] = [
  {
    id: "daily-basic",
    title: "Базовый уход на каждый день",
    description: "Подбор базовых средств по типу кожи и цели.",
    groups: ["skin-type", "goals"],
  },
  {
    id: "acne",
    title: "Акне / высыпания",
    description: "Фокус на цели + активы (BHA/ретиноиды/ниацинамид и т.п.).",
    groups: ["skin-type", "goals", "actives"],
  },
  {
    id: "pigmentation",
    title: "Пигментация / тон",
    groups: ["skin-type", "goals", "actives"],
  },
  {
    id: "antiage",
    title: "Антивозраст",
    groups: ["skin-type", "goals", "actives"],
  },
];



