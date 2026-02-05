 import { useState, useMemo } from "react";
 import { Input } from "@/components/ui/input";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Search, Check } from "lucide-react";
 import { cn } from "@/lib/utils";
 import {
   industryCatalog,
   searchIndustries,
   getPopularIndustries,
   type IndustryCatalogEntry,
 } from "@/data/industryCatalog";
 
 interface IndustrySelectorGridProps {
   value: string;
   onChange: (slug: string, industry: IndustryCatalogEntry) => void;
 }
 
 export function IndustrySelectorGrid({ value, onChange }: IndustrySelectorGridProps) {
   const [searchQuery, setSearchQuery] = useState("");
 
   // Get popular industries for initial display
   const popularIndustries = useMemo(() => getPopularIndustries(12), []);
 
   // Filter industries based on search
   const filteredIndustries = useMemo(() => {
     if (!searchQuery) return popularIndustries;
     return searchIndustries(searchQuery).slice(0, 20);
   }, [searchQuery, popularIndustries]);
 
   // All industries for "show all" view
   const allIndustries = useMemo(() => {
     if (searchQuery) return filteredIndustries;
     return industryCatalog
       .filter(i => i.slug !== "other")
       .sort((a, b) => a.name.localeCompare(b.name));
   }, [searchQuery, filteredIndustries]);
 
   const [showAll, setShowAll] = useState(false);
   const displayedIndustries = showAll ? allIndustries : filteredIndustries;
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div>
         <h2 className="text-2xl font-semibold tracking-tight">
           What type of business do you run?
         </h2>
         <p className="mt-2 text-muted-foreground">
           We'll customize your AI receptionist for your industry.
         </p>
       </div>
 
       {/* Search */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search industries..."
           value={searchQuery}
           onChange={(e) => {
             setSearchQuery(e.target.value);
             setShowAll(!!e.target.value);
           }}
           className="pl-10"
         />
       </div>
 
       {/* Industry Grid */}
       <ScrollArea className="h-[320px]">
         <div className="grid grid-cols-2 gap-3 pr-4">
           {displayedIndustries.map((industry) => {
             const isSelected = value === industry.slug;
             return (
               <button
                 key={industry.slug}
                 type="button"
                 onClick={() => onChange(industry.slug, industry)}
                 className={cn(
                   "flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
                   isSelected
                     ? "border-primary bg-primary/5 ring-2 ring-primary"
                     : "border-border hover:border-primary/50 hover:bg-muted/30"
                 )}
               >
                 <span className="text-2xl shrink-0">{industry.icon}</span>
                 <span className="font-medium text-sm truncate flex-1">
                   {industry.name}
                 </span>
                 {isSelected && (
                   <Check className="w-4 h-4 text-primary shrink-0" />
                 )}
               </button>
             );
           })}
         </div>
 
         {/* Show all toggle */}
         {!searchQuery && !showAll && (
           <button
             type="button"
             onClick={() => setShowAll(true)}
             className="w-full mt-4 py-2 text-sm text-primary hover:underline"
           >
             Show all 80+ industries
           </button>
         )}
 
         {/* "Other" option at bottom */}
         {(showAll || searchQuery) && (
           <div className="mt-4 pt-4 border-t">
             <button
               type="button"
               onClick={() => {
                 const other = industryCatalog.find(i => i.slug === "other");
                 if (other) onChange(other.slug, other);
               }}
               className={cn(
                 "flex items-center gap-3 p-4 rounded-lg border text-left transition-all w-full",
                 value === "other"
                   ? "border-primary bg-primary/5"
                   : "border-border hover:border-primary/50"
               )}
             >
               <span className="text-2xl">🏢</span>
               <div className="flex-1">
                 <span className="font-medium text-sm">Other / General Business</span>
                 <p className="text-xs text-muted-foreground">
                   Start with a blank template
                 </p>
               </div>
               {value === "other" && (
                 <Check className="w-4 h-4 text-primary shrink-0" />
               )}
             </button>
           </div>
         )}
 
         {/* No results */}
         {displayedIndustries.length === 0 && (
           <div className="text-center py-8 text-muted-foreground">
             <p>No industries found for "{searchQuery}"</p>
             <p className="text-sm mt-1">Try a different search term</p>
           </div>
         )}
       </ScrollArea>
     </div>
   );
 }