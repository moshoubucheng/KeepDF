interface ToolCardProps {
  name: string;
  description: string;
  icon: string;
  href: string;
}

export default function ToolCard({ name, description, icon, href }: ToolCardProps) {
  return (
    <a
      href={href}
      className="group block rounded-xl border border-edge bg-surface p-5 transition-all hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 duration-200"
    >
      <span className="mb-2 block text-2xl">{icon}</span>
      <h3 className="text-base font-semibold text-fg group-hover:text-brand-600">
        {name}
      </h3>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
    </a>
  );
}
