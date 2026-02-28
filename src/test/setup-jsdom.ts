import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import React from "react"

afterEach(() => cleanup())

// Rechartsを軽量モック（jsdomではSVG計測が不安定なため）
// DOM要素に有効な属性のみ転送し、Recharts固有propsの警告を抑制
const ALLOWED_PREFIXES = ["data-", "aria-"]
const ALLOWED_KEYS = new Set(["className", "style", "role", "id"])

function pickDomProps(props: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === "children") continue
    if (ALLOWED_KEYS.has(key) || ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
      result[key] = props[key]
    }
  }
  return result
}

const mockComp = (name: string) => {
  const C = ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(
      "div",
      { "data-testid": `recharts-${name}`, ...pickDomProps(props) },
      children as React.ReactNode,
    )
  C.displayName = `Mock${name}`
  return C
}

vi.mock("recharts", () => ({
  ResponsiveContainer: mockComp("ResponsiveContainer"),
  PieChart: mockComp("PieChart"),
  Pie: mockComp("Pie"),
  Cell: mockComp("Cell"),
  BarChart: mockComp("BarChart"),
  Bar: mockComp("Bar"),
  LineChart: mockComp("LineChart"),
  Line: mockComp("Line"),
  CartesianGrid: mockComp("CartesianGrid"),
  XAxis: mockComp("XAxis"),
  YAxis: mockComp("YAxis"),
  ReferenceLine: mockComp("ReferenceLine"),
  Tooltip: mockComp("Tooltip"),
  Legend: mockComp("Legend"),
}))
