import { useState, useEffect } from "react";
import { Check, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface MultiAtendentesSelectProps {
  users: User[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  primaryUserId?: string;
  onPrimaryChange?: (userId: string) => void;
  disabled?: boolean;
}

export function MultiAtendentesSelect({
  users,
  selectedUserIds,
  onChange,
  primaryUserId,
  onPrimaryChange,
  disabled,
}: MultiAtendentesSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      // Don't allow removing primary user
      if (userId === primaryUserId) return;
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const handleSetPrimary = (userId: string) => {
    if (onPrimaryChange) {
      onPrimaryChange(userId);
      // Ensure primary is in selected list
      if (!selectedUserIds.includes(userId)) {
        onChange([...selectedUserIds, userId]);
      }
    }
  };

  const getUserName = (user: User) => {
    return user.full_name || user.email?.split("@")[0] || "Sem nome";
  };

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
            disabled={disabled}
          >
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant={user.id === primaryUserId ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {getUserName(user)}
                    {user.id === primaryUserId && (
                      <span className="ml-1 text-[10px]">(principal)</span>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecione os atendentes</span>
            )}
            <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">Atendentes Responsáveis</p>
            <p className="text-xs text-muted-foreground">
              Selecione um ou mais atendentes. Clique com botão direito para definir o principal.
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {users.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              const isPrimary = user.id === primaryUserId;

              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/10",
                    isPrimary && "ring-1 ring-primary"
                  )}
                  onClick={() => handleToggle(user.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleSetPrimary(user.id);
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(user.id)}
                    disabled={isPrimary}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getUserName(user)}
                    </p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                  {isPrimary && (
                    <Badge variant="default" className="text-[10px] shrink-0">
                      Principal
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              💡 Clique direito em um atendente para torná-lo o principal
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
