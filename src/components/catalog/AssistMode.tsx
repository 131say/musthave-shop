"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSIST_SCENARIOS } from "@/lib/assistScenarios";

type TaskOption = {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  goals: string[];
  actives: string[];
  skinType?: string;
  description: string;
};

// Маппинг иконок и описаний для сценариев
const SCENARIO_META: Record<string, { icon: string; subtitle: string; description: string }> = {
  "daily-basic": {
    icon: "💧",
    subtitle: "Базовый уход на каждый день",
    description: "Подбор базовых средств по типу кожи и цели",
  },
  acne: {
    icon: "🔥",
    subtitle: "Прыщи, чёрные точки, воспаления",
    description: "Средства с рабочими активами\nБез лишней агрессии",
  },
  pigmentation: {
    icon: "✨",
    subtitle: "Пятна, следы пост-акне, неровный цвет",
    description: "Выравнивает тон\nВозвращает сияние коже",
  },
  antiage: {
    icon: "⏳",
    subtitle: "Морщины, потеря упругости",
    description: "Активный уход для обновления кожи\nПодходит для курсового применения",
  },
};

// Преобразуем сценарии в формат для UI
const GOALS_ACTIVES_MAP: Record<string, { goals: string[]; actives: string[]; skinType?: string }> = {
  "daily-basic": {
    goals: ["увлажнение"],
    actives: [],
  },
  acne: {
    goals: ["акневысыпания"],
    actives: ["bha", "ниацинамид"],
  },
  pigmentation: {
    goals: ["пигментацияпятна"],
    actives: ["витамин-c", "ниацинамид", "aha"],
  },
  antiage: {
    goals: ["антивозраст"],
    actives: ["ретинол", "пептиды", "витамин-c", "aha"],
  },
};

const TASK_MAPPING: TaskOption[] = ASSIST_SCENARIOS.map(scenario => {
  const meta = SCENARIO_META[scenario.id] || { icon: "✨", subtitle: scenario.description || "", description: scenario.description || "" };
  const mapping = GOALS_ACTIVES_MAP[scenario.id] || { goals: [], actives: [] };
  
  return {
    id: scenario.id,
    icon: meta.icon,
    label: scenario.title,
    subtitle: meta.subtitle,
    goals: mapping.goals,
    actives: mapping.actives,
    skinType: mapping.skinType,
    description: meta.description,
  };
});

export default function AssistMode(props?: {
  scenarios?: TaskOption[];
  onPickScenario?: (id: string) => void;
}) {
  const router = useRouter();
  const { scenarios = TASK_MAPPING, onPickScenario } = props || {};
  const [pickedId, setPickedId] = useState<string | null>(null);

  const picked = useMemo(
    () => scenarios.find((s) => s.id === pickedId) || null,
    [scenarios, pickedId]
  );

  function handlePick(task: TaskOption) {
    setPickedId(task.id);
    if (typeof onPickScenario === "function") {
      onPickScenario(task.id);
    } else {
      // Дефолтная логика навигации
      const params = new URLSearchParams();
      
      // Добавляем scenarioId для API подбора
      params.set("scenarioId", task.id);
      
      if (task.goals.length > 0) {
        params.set("goals", task.goals.join(","));
      }
      
      if (task.actives.length > 0) {
        params.set("actives", task.actives.join(","));
      }
      
      if (task.skinType) {
        params.set("skin", task.skinType);
      }
      
      params.set("assist", "1");
      
      router.push(`/catalog?${params.toString()}`);
    }
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-3">
            Подберём уход за 30 секунд
          </h1>
          <p className="text-lg text-slate-600 dark:text-gray-300 mb-2">
            Ты не обязана разбираться в составах.
            <br />
            Выбери задачу — мы покажем, что действительно работает.
          </p>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Можно изменить подбор в любой момент
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {scenarios.map((s) => {
            const active = pickedId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handlePick(s)}
                className={[
                  "text-left rounded-2xl border p-6 shadow-sm transition",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-pink-300",
                  "dark:bg-neutral-900 dark:border-neutral-700",
                  active ? "border-blue-600 ring-1 ring-blue-600" : "border-pink-200",
                ].join(" ")}
              >
                <div className="text-2xl">{s.icon ?? "✨"}</div>
                <div className="mt-3 text-xl font-semibold dark:text-white">{s.label}</div>
                {s.subtitle ? (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{s.subtitle}</div>
                ) : null}
                {s.description ? (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{s.description}</div>
                ) : null}
              </button>
            );
          })}
        </div>

        {picked ? (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Выбрано: <span className="font-semibold">{picked.label}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
