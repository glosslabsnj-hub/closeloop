 import { useState } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from "@/components/ui/alert-dialog";
 import { AlertTriangle, Download, Trash2, Loader2 } from "lucide-react";
 import { toast } from "sonner";
 
 export function DangerZoneSection() {
   const { tenant, signOut } = useAuth();
   const [confirmText, setConfirmText] = useState("");
   const [isExporting, setIsExporting] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
 
   const handleExportData = async () => {
     if (!tenant?.id) return;
     setIsExporting(true);
     try {
       // Fetch tenant data from multiple tables
       const [tenantData, bookings, customers, services, conversations] = await Promise.all([
         supabase.from("tenants").select("*").eq("id", tenant.id).single(),
         supabase.from("bookings").select("*").eq("tenant_id", tenant.id).limit(5000),
         supabase.from("customers").select("*").eq("tenant_id", tenant.id).limit(5000),
         supabase.from("services").select("*").eq("tenant_id", tenant.id).limit(5000),
         supabase.from("conversations").select("*").eq("tenant_id", tenant.id).limit(5000),
       ]);

       const exportData = {
         exported_at: new Date().toISOString(),
         tenant: tenantData.data,
         bookings: bookings.data || [],
         customers: customers.data || [],
         services: services.data || [],
         conversations: conversations.data || [],
       };

       const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
       const url = URL.createObjectURL(blob);
       const link = document.createElement("a");
       link.href = url;
       link.download = `flux-receptionist-export-${tenant.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
       link.click();
       URL.revokeObjectURL(url);

       toast.success("Export complete", {
         description: "Your data has been downloaded as a JSON file.",
       });
     } catch (error) {
       toast.error("Export failed", {
         description: "Please try again or contact support.",
       });
     } finally {
       setIsExporting(false);
     }
   };
 
   const businessName = tenant?.name || "";
   const confirmTarget = businessName || "DELETE";

   const handleDeleteAccount = async () => {
     if (confirmText !== confirmTarget) return;

     setIsDeleting(true);
     try {
       toast.success("Account deletion requested", {
         description: "To complete data deletion, please contact support@getfluxdata.com. You have been signed out.",
       });
       signOut?.();
     } catch (error) {
       toast.error("Failed to process request", {
         description: "Please try again or contact support.",
       });
       setIsDeleting(false);
     }
   };
 
   return (
     <Card className="border-destructive/50">
       <CardHeader>
         <CardTitle className="text-destructive flex items-center gap-2">
           <AlertTriangle className="w-5 h-5" />
           Danger Zone
         </CardTitle>
         <CardDescription>
           Irreversible and destructive actions. Proceed with caution.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Export Data */}
         <div className="flex items-center justify-between p-4 rounded-lg border">
           <div className="min-w-0 flex-1">
             <p className="font-medium">Export Data</p>
             <p className="text-sm text-muted-foreground">
               Download all your data including calls, leads, and settings.
             </p>
           </div>
           <Button
             variant="outline"
             onClick={handleExportData}
             disabled={isExporting}
             className="shrink-0 ml-4"
           >
             {isExporting ? (
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
             ) : (
               <Download className="w-4 h-4 mr-2" />
             )}
             Export
           </Button>
         </div>
 
         {/* Delete Account */}
         <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
           <div className="min-w-0 flex-1">
             <p className="font-medium">Delete Account</p>
             <p className="text-sm text-muted-foreground">
               Permanently delete your account and all data. This cannot be undone.
             </p>
           </div>
           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive" className="shrink-0 ml-4">
                 <Trash2 className="w-4 h-4 mr-2" />
                 Delete Account
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                 <AlertDialogDescription>
                   This will sign you out and request account deletion. Actual data
                   deletion requires contacting support. This cannot be undone once
                   processed.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <div className="py-4 space-y-2">
                 <Label htmlFor="confirm-delete">
                   Type <span className="font-mono font-bold">{confirmTarget}</span> to confirm
                 </Label>
                 <Input
                   id="confirm-delete"
                   placeholder={confirmTarget}
                   value={confirmText}
                   onChange={(e) => setConfirmText(e.target.value)}
                   className="font-mono"
                 />
               </div>
               <AlertDialogFooter>
                 <AlertDialogCancel onClick={() => setConfirmText("")}>
                   Cancel
                 </AlertDialogCancel>
                 <AlertDialogAction
                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                   disabled={confirmText !== confirmTarget || isDeleting}
                   onClick={handleDeleteAccount}
                 >
                   {isDeleting ? (
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   ) : (
                     <Trash2 className="w-4 h-4 mr-2" />
                   )}
                   Delete Account
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
         </div>
       </CardContent>
     </Card>
   );
 }