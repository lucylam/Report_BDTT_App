"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption, EChartsType } from "echarts";
import { cn } from "@/lib/ui";

interface ExcelLikeChartProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly height?: number;
  readonly option: EChartsOption;
}

const cssVariablePattern = /^var\((--[^)]+)\)$/;

const resolveCssVariables = (value: unknown, styles: CSSStyleDeclaration): unknown => {
  if (typeof value === "string") {
    const match = cssVariablePattern.exec(value.trim());
    return match ? styles.getPropertyValue(match[1]).trim() || value : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveCssVariables(item, styles));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveCssVariables(item, styles)])
    );
  }
  return value;
};

export const ExcelLikeChart = ({
  ariaLabel,
  className,
  height,
  option
}: ExcelLikeChartProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const optionRef = useRef(option);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;

    const updateOption = (): void => {
      const chart = chartRef.current;
      if (!chart) return;
      const styles = getComputedStyle(document.documentElement);
      chart.setOption(
        resolveCssVariables(optionRef.current, styles) as EChartsOption,
        { notMerge: true }
      );
    };

    void import("echarts").then((echarts) => {
      if (cancelled || !containerRef.current) return;
      const existing = echarts.getInstanceByDom(containerRef.current);
      chartRef.current = existing ?? echarts.init(containerRef.current, undefined, { renderer: "svg" });
      updateOption();

      resizeObserver = new ResizeObserver(() => chartRef.current?.resize());
      resizeObserver.observe(containerRef.current);

      themeObserver = new MutationObserver(updateOption);
      themeObserver.observe(document.documentElement, {
        attributeFilter: ["class", "style"],
        attributes: true
      });
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    optionRef.current = option;
    const chart = chartRef.current;
    if (!chart) return;
    const styles = getComputedStyle(document.documentElement);
    chart.setOption(resolveCssVariables(option, styles) as EChartsOption, { notMerge: true });
  }, [option]);

  return (
    <div
      aria-label={ariaLabel}
      className={cn("min-h-72 min-w-0 w-full", className)}
      ref={containerRef}
      role="img"
      style={height ? { height } : undefined}
    />
  );
};
