import { useState, useEffect } from "react";
import { Wifi, BatteryMedium, SignalHigh } from "lucide-react";

export function AndroidStatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="android-status-bar"
      className="w-full flex items-center justify-between px-5 pt-2 pb-1 text-xs text-slate-400 select-none bg-[#0b0f19] z-20 border-b border-white/[0.04]"
    >
      <div className="flex items-center gap-1 font-mono font-medium text-slate-300">
        <span>{time || "12:00"}</span>
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-[10px] tracking-wider text-cyan-400 font-semibold uppercase">5G</span>
        <SignalHigh className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-slate-400">94%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}
