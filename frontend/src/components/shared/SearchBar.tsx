"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  const [internal, setInternal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes
  useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setInternal(newValue);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const handleClear = () => {
    setInternal("");
    clearTimeout(debounceRef.current);
    onChange("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="text"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
      />
      {internal && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
