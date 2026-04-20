import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { BsFileEarmarkPlus } from "react-icons/bs";

function CreateFormBtn() {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to the form builder page directly
    const returnTo = sessionStorage.getItem('formsReturnTo');
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    router.push(`/dashboard/forms/builder${qs}`);
  };

  return (
    <Button
      variant={"outline"}
      className="group border border-primary/20 h-[200px] items-center justify-center flex flex-col hover:border-primary hover:cursor-pointer border-dashed gap-4"
      onClick={handleClick}
    >
      <BsFileEarmarkPlus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
      <p className="font-bold text-xl text-muted-foreground group-hover:text-primary">
        Create new form
      </p>
    </Button>
  );
}

export default CreateFormBtn;
