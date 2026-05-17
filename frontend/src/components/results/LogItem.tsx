interface LogItemProps {
  time: string;
  event: string;
}

export function LogItem({ time, event }: LogItemProps) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-white/20 pl-4 py-1">
      <div className="space-y-0.5">
        <p className="text-[10px] text-white/50 font-mono">{time}</p>
        <p className="text-[10px] font-medium leading-tight">{event}</p>
      </div>
    </div>
  );
}
