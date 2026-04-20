import React from "react";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const CreateBtn = ({ basePath, onClick }) => {
  const { replace } = useRouter();
  const pathname = usePathname();

  const handleCreate = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }
    const targetBase = basePath || pathname;
    replace(`${targetBase}/add`);
  };
  return (
    <Button
      size="sm"
      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] h-6 px-2 gap-1 lg:flex shadow-md text-xs"
      onClick={handleCreate}
    >
      <PlusCircle className="h-3.5 w-3.5" />
      <span className="sm:inline-block">Create New</span>
    </Button>
  );
};

export default CreateBtn;
