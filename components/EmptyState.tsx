interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
}

export const EmptyState = ({
  title,
  description
}: EmptyStateProps): React.ReactElement => {
  return (
    <div className="soft-card rounded-3xl border-dashed p-8 text-center">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
    </div>
  );
};
