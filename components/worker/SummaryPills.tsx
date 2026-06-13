import { SegmentBar } from "@/components/ui";
import type { ProgressPercent } from "@/types/domain";

interface SummaryPillsProps {
  readonly percents: readonly ProgressPercent[];
}

export const SummaryPills = ({ percents }: SummaryPillsProps): React.ReactElement => {
  const done = percents.filter((percent) => percent === 100).length;
  const progress = percents.filter((percent) => percent > 0 && percent < 100).length;
  const todo = percents.filter((percent) => percent === 0).length;

  return (
    <SegmentBar
      legend
      segments={[
        { value: done, tone: "success", label: "Hoàn thành" },
        { value: progress, tone: "accent", label: "Đang làm" },
        { value: todo, tone: "neutral", label: "Chưa làm" }
      ]}
    />
  );
};
