import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center flex flex-col items-center space-y-6">
        <div className="bg-muted p-6 rounded-full inline-block">
          <FileQuestion className="w-16 h-16 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">404 - Not Found</h1>
          <p className="mt-2 text-muted-foreground">The page you are looking for does not exist.</p>
        </div>
        <Link href="/" className="inline-block">
          <Button variant="accent" size="lg">Return to Chat</Button>
        </Link>
      </div>
    </div>
  );
}
