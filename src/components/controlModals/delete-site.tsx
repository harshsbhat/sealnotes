import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { deleteNotes } from "@/app/actions/delete"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'

type deletProps = {
    params: string;
    currentInitHash: string;
  };


export function DeleteSite({params, currentInitHash}: deletProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsConfirmed(value.toLowerCase() === "confirm")
  }

  const handleDelete = async () => {
    try {
      const response = await deleteNotes(params, currentInitHash);
      toast({
        title: "Success!",
        description: response.message,
        variant: "default",
      });
      router.replace("/");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Try again later or refresh the page.",
        variant: "destructive",
      });
    }
  }
  
  

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            To confirm the deletion, please type &quot;confirm&quot; below. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type 'confirm' to proceed"
          />
        </div>
        <DialogFooter>
          <Button className="w-full" variant="destructive" disabled={!isConfirmed} onClick={handleDelete}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
