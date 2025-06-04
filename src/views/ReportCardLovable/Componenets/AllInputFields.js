
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  placeholder?: string;
}

export function AIInputField({
  label,
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  placeholder
}: AIInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pr-10 min-h-[150px] resize-y",
            isFocused && "ring-2 ring-edu-blue ring-opacity-50",
            isGenerating && "bg-blue-50"
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-2 text-muted-foreground hover:text-edu-accent hover:bg-transparent",
            isGenerating && "text-edu-blue animate-pulse-light"
          )}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <Wand2 className="h-4 w-4" />
          <span className="sr-only">Generate with AI</span>
        </Button>
      </div>
      {isGenerating && (
        <p className="text-xs text-edu-light-blue animate-pulse">
          Generating content...
        </p>
      )}
    </div>
  );
}
