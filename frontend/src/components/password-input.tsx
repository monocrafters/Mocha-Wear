"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ui } from "@/lib/admin-ui";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
};

export function PasswordInput({ value, onChange, autoComplete, required }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1.5">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={`${ui.input} mt-0 pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
