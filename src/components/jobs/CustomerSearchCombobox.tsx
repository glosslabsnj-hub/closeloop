import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useCustomers, type Customer } from "@/hooks/useCustomers";

interface CustomerSearchComboboxProps {
  value: string | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
}

export function CustomerSearchCombobox({
  value,
  onSelect,
  placeholder = "Search customers...",
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const { customers, isLoading } = useCustomers();

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === value) ?? null,
    [customers, value]
  );

  const displayLabel = selectedCustomer
    ? `${selectedCustomer.full_name}${selectedCustomer.phone_e164 ? ` • ${selectedCustomer.phone_e164}` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a name or phone..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : "No customers found."}
            </CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground text-xs"
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Clear selection (manual entry)
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.full_name} ${customer.phone_e164 || ""} ${customer.email || ""}`}
                  onSelect={() => {
                    onSelect(customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{customer.full_name}</span>
                    {customer.phone_e164 && (
                      <span className="text-xs text-muted-foreground">
                        {customer.phone_e164}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
