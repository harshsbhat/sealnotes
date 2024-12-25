"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client } from "@/app/[...slug]/client";
import { saveNotes } from "@/app/actions/save";
import { toast } from "@/hooks/use-toast";
import { encrypt, sha256 } from "@/app/utils/vault";
import { useRouter } from "next/navigation";

interface CreateSiteProps {
  params: string;
}

export function CreateNewSite({ params }: CreateSiteProps) {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMatch, setPasswordMatch] = React.useState(true);
  const [siteCreated, setSiteCreated] = React.useState(false);
  const initHash = sha256("");
  const router = useRouter(); 

  // Handle cancel redirect
  const handleCancel = () => {
    router.replace("/"); // Redirect to home page
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordMatch(false);
      return;
    }

    setPasswordMatch(true);
    try {
      const encryptedNotes = encrypt("", password);
      const response = await saveNotes(
        params,
        encryptedNotes,
        initHash,
        initHash,
      );
      setSiteCreated(true);

      toast({
        title: "Success!",
        description: response.message,
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description:
          "An unexpected error occurred. Try again later or refresh the page.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      {siteCreated ? (
        <Client params={params} decryptedData="" hash={password} />
      ) : (
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Great! This site is not taken.</CardTitle>
            <CardDescription>
              Create a new site for your notepad.
              <br /> <br />
              <span className="font-semibold">
                We do not store user information, so the password cannot be
                recovered if lost. Keep it safe.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {!passwordMatch && (
                    <p className="mt-1 text-xs text-red-500">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
