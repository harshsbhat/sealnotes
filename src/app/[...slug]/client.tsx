'use client'

import { useEffect, useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { saveNotes } from "@/app/actions/save";
import RichTextEditor from "@/components/editor/Tiptap";
import { decrypt, encrypt, sha256 } from "@/app/utils/vault";
import { refresh } from "../actions/refresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { PlusCircle, X, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { DeleteSite } from "@/components/controlModals/delete-site";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import LoadingBtn from "@/components/LoadingBtn";


const noteSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const tabsSchema = z.array(noteSchema);

interface ClientProps {
  params: string;
  decryptedData: string;
  hash: string;
}



type ChangePasswordProps = {
  params: string;
  values: string;
  currentInitHash: string;
};


type TabsValues = z.infer<typeof tabsSchema>;

export function Client({ params, decryptedData, hash }: ClientProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [isDirty, setIsDirty] = useState<boolean[]>([]);
  const [editorContentKeys, setEditorContentKeys] = useState<number[]>([]);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState(hash)
  const [currentInitHash, setCurrentInitHash] = useState(sha256(decryptedData));
  const [startDragged, setDragged] = useState(null);

  const initialTabs: TabsValues = (() => {
    try {
      const parsed = JSON.parse(decryptedData) as string;
      return tabsSchema.parse(parsed);
    } catch {
      return [{ title: "New Note", description: decryptedData || "" }];
    }
  })();

  const form = useForm<{ tabs: TabsValues }>({
    resolver: zodResolver(z.object({ tabs: tabsSchema })),
    defaultValues: { tabs: initialTabs },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
    getValues,
    setValue,
  } = form;

  useEffect(() => {
    setIsDirty(new Array(initialTabs.length).fill(false));
    setEditorContentKeys(new Array(initialTabs.length).fill(0));
  }, [initialTabs.length]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsListRef.current) {
      const scrollAmount = tabsListRef.current.clientWidth / 2;
      tabsListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  async function onRefresh() {
    try {
      const currentData = await refresh(params);
      const decrypted = decrypt(currentData as string, password);
      const refreshedTabs = JSON.parse(decrypted) as { title: string; description: string }[];
      toast({
        title: "Refreshed!",
        description: "Data has been successfully refreshed.",
        variant: "default",
      });
      setValue("tabs", refreshedTabs);
      setIsDirty(new Array(refreshedTabs.length).fill(false));
      setEditorContentKeys((prevKeys) => prevKeys.map((key) => key + 1));

    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again later.",
        variant: "destructive",
      });
    }
  }

  async function onSubmit(values: { tabs: TabsValues }) {
    try {
      const jsonData = JSON.stringify(values.tabs)
      const currentHash = sha256(jsonData);
      const encryptedNotes = encrypt(jsonData, password);
      const response = await saveNotes(params, encryptedNotes, currentInitHash, currentHash);
      toast({
        title: "Success!",
        description: response.message,
        variant: "default",
      });
      setIsDirty(new Array(values.tabs.length).fill(false));
      setCurrentInitHash(response.currentHash);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error saving your notes",
        description:
          "We are unable to save the data at the moment. This is usually because of consecutive write operations. Backup the data and then refresh the page.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty.some(Boolean)) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const addNewTab = () => {
    const currentTabs = getValues("tabs");
    setValue("tabs", [...currentTabs, { title: "New Note", description: "" }]);
    setActiveTab(currentTabs.length);
    setIsDirty((prev) => [...prev, false]);
    setEditorContentKeys((prev) => [...prev, 0]);
  };

  const removeTab = (indexToRemove: number) => {
    const currentTabs = getValues("tabs");
    if (currentTabs.length > 1) {
      setValue("tabs", currentTabs.filter((_, index) => index !== indexToRemove));
      setIsDirty((prev) => prev.filter((_, index) => index !== indexToRemove));
      setEditorContentKeys((prev) => prev.filter((_, index) => index !== indexToRemove));
      if (activeTab >= indexToRemove && activeTab > 0) {
        setActiveTab(activeTab - 1);
      }
    }
  };

  function ChangePassword({ params, values, currentInitHash }: ChangePasswordProps) {
    const { toast } = useToast()
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewPassword(e.target.value)
    }

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value)
    }

    const isPasswordsMatch = newPassword === confirmPassword
    const isFormValid = newPassword && confirmPassword && isPasswordsMatch

    const handleSubmit = async () => {
      if (!isFormValid) {
        return
      }

      setIsSubmitting(true)

      try {
        const currentHash = sha256(values)
        const encryptedNotes = encrypt(values, newPassword)
        const response = await saveNotes(params, encryptedNotes, currentInitHash, currentHash)

        toast({
          title: "Success!",
          description: "Password has been successfully changed.",
          variant: "default",
        })
        setPassword((newPassword))
        setCurrentInitHash(response.currentHash);
      } catch (error) {
        console.error("Error saving notes:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred. Try again later or refresh the page.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Change Password</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>
              Enter your new password below and confirm it to save the changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              placeholder="Enter new password"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm new password"
            />
          </div>
          <DialogFooter>
            <LoadingBtn
              disabled={!isFormValid || isSubmitting}
              onClick={handleSubmit}
              loading={isSubmitting}
              className="w-full"
            >
              Save Changes
            </LoadingBtn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }


  function ButtonGroup() {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:gap-0">
        <Link href="/">
          <div className="text-lg font-semibold hidden sm:block">
            SealNotes
          </div>
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onRefresh}>
            Refresh
          </Button>
          <ChangePassword params={params} values={JSON.stringify(getValues("tabs"))} currentInitHash={currentInitHash} />
          <LoadingBtn onClick={handleSubmit(onSubmit)} loading={isSubmitting} className="w-full sm:w-auto">
            Save
          </LoadingBtn>
          <DeleteSite params={params} currentInitHash={currentInitHash} />
          <ModeToggle />
        </div>
      </div>
    );
  }

  const handleDrop = (index: number) => {
    const newArray = [...getValues("tabs")];
    const [moveditem] = newArray.splice(activeTab, 1);
    newArray.splice(index, 0, moveditem);
    setValue("tabs", newArray, { shouldDirty: true });
    setIsDirty((prev) => [...prev, false]);
  };


  // Handle dragging over an element (prevents default to allow dropping)
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };



  return (
    <div className="flex justify-center w-full h-[100vh]">
      <Form {...form}>
        <div className="space-y-6 p-4 w-full max-w-4xl">
          <ButtonGroup />
          <Tabs
            value={activeTab.toString()}
            onValueChange={(value: string) => setActiveTab(parseInt(value))}
          >
            <div className="relative flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scrollTabs('left')}
                className="flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Scroll left</span>
              </Button>
              <div className="flex-grow overflow-hidden" ref={tabsListRef}>
                <TabsList className="inline-flex w-max space-x-1 p-1">
                  {getValues("tabs")?.map((tab, index) => (

                    <TabsTrigger
                      onDragOver={handleDragOver} onDrop={() => handleDrop(index)} draggable key={index} value={index.toString()} className="flex items-center whitespace-nowrap">
                      <span className="truncate max-w-[100px]">{tab.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Close tab</span>
                      </Button>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scrollTabs('right')}
                className="flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Scroll right</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={addNewTab}
                className="flex-shrink-0"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="sr-only">Add new tab</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {getValues("tabs").map((tab, index) => (
                    <DropdownMenuItem key={index} onSelect={() => setActiveTab(index)}>
                      {tab.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {getValues("tabs").map((tab, index) => (
              <TabsContent key={index} value={index.toString()}>
                <FormField
                  control={control}
                  name={`tabs.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Note Title"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setIsDirty((prev) => {
                              const newDirty = [...prev];
                              newDirty[index] = true;
                              return newDirty;
                            });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`tabs.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RichTextEditor
                          key={editorContentKeys[index]}
                          initialContent={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsDirty((prev) => {
                              const newDirty = [...prev];
                              newDirty[index] = true;
                              return newDirty;
                            });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Form>
    </div>
  );
}

