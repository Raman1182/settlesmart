
"use client";

import { Header } from "@/components/header";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";

export default function GroupsPage() {
  const { groups, currentUser } = useSettleSmart();
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header pageTitle="Groups" />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="flex flex-col cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/20"
              onClick={() => router.push(`/group/${group.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{group.name}</span>
                </CardTitle>
                <CardDescription>
                  {group.members.length} member{group.members.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
              <CardFooter>
                 <Button variant="link" className="p-0 h-auto text-primary">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
            <h3 className="text-xl font-bold mb-2">No groups yet</h3>
            <p className="mb-4">Create a group to start sharing expenses!</p>
            <CreateGroupDialog>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Group
                </Button>
            </CreateGroupDialog>
          </div>
        )}
      </main>

      {groups.length > 0 && (
         <CreateGroupDialog>
            <Button
                size="icon"
                className="fixed bottom-24 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg shadow-primary/40"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Create Group</span>
            </Button>
        </CreateGroupDialog>
      )}
    </div>
  );
}
