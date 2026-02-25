/**
 * Product Knowledge Editor (Service Mode)
 * 
 * Allows service businesses to document products/materials they use
 * so the AI can educate customers and upsell appropriately.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface ProductKnowledge {
  id: string;
  tenant_id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  benefits: string[] | null;
  usage_instructions: string | null;
  warnings: string | null;
  price_range: string | null;
  is_premium: boolean;
  upsell_script: string | null;
  related_services: string[] | null;
  created_at: string;
}

export function ProductKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<ProductKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductKnowledge | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBenefits, setFormBenefits] = useState("");
  const [formUsage, setFormUsage] = useState("");
  const [formWarnings, setFormWarnings] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formIsPremium, setFormIsPremium] = useState(false);
  const [formUpsell, setFormUpsell] = useState("");
  const [formServices, setFormServices] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("product_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("product_name");
    if (!error) setItems((data as ProductKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormName("");
    setFormBrand("");
    setFormCategory("");
    setFormDescription("");
    setFormBenefits("");
    setFormUsage("");
    setFormWarnings("");
    setFormPrice("");
    setFormIsPremium(false);
    setFormUpsell("");
    setFormServices("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ProductKnowledge) => {
    setEditingItem(item);
    setFormName(item.product_name);
    setFormBrand(item.brand || "");
    setFormCategory(item.category || "");
    setFormDescription(item.description || "");
    setFormBenefits(item.benefits?.join(", ") || "");
    setFormUsage(item.usage_instructions || "");
    setFormWarnings(item.warnings || "");
    setFormPrice(item.price_range || "");
    setFormIsPremium(item.is_premium);
    setFormUpsell(item.upsell_script || "");
    setFormServices(item.related_services?.join(", ") || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        product_name: formName.trim(),
        brand: formBrand.trim() || null,
        category: formCategory.trim() || null,
        description: formDescription.trim() || null,
        benefits: formBenefits.split(",").map(s => s.trim()).filter(Boolean),
        usage_instructions: formUsage.trim() || null,
        warnings: formWarnings.trim() || null,
        price_range: formPrice.trim() || null,
        is_premium: formIsPremium,
        upsell_script: formUpsell.trim() || null,
        related_services: formServices.split(",").map(s => s.trim()).filter(Boolean),
      };

      if (editingItem) {
        const { error } = await supabase
          .from("product_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Product knowledge updated");
      } else {
        const { error } = await supabase
          .from("product_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Product knowledge added");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const { error } = await supabase
        .from("product_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Product knowledge deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formName) return "";
    let preview = `We use ${formName}`;
    if (formBrand) preview = `We use ${formBrand} ${formName}`;
    if (formIsPremium) preview += ", which is a premium product";
    if (formBenefits) {
      const benefits = formBenefits.split(",").map(s => s.trim()).filter(Boolean);
      if (benefits.length > 0) {
        preview += `. It ${benefits.slice(0, 2).join(" and ").toLowerCase()}`;
      }
    }
    preview += ".";
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Product & Material Knowledge"
        description="Teach your AI about the products and materials you use so it can educate customers."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Product"
        emptyState={{
          icon: Package,
          title: "No product knowledge yet",
          description: "Add products and materials you use so your AI can explain their benefits.",
        }}
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {item.brand ? `${item.brand} ` : ""}{item.product_name}
              </span>
              {item.is_premium && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                  <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                  Premium
                </Badge>
              )}
              {item.category && (
                <Badge variant="outline" className="text-xs">{item.category}</Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
            )}
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Product" : "Add Product Knowledge"}</DialogTitle>
            <DialogDescription>
              Document a product or material so your AI can explain its benefits to customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  placeholder="e.g., Ceramic Coating, Color Gloss"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  placeholder="e.g., Redken, 3M, Sherwin-Williams"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Paint, Hair Color, Sealant"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formIsPremium} onCheckedChange={setFormIsPremium} />
                <Label className="text-sm">Premium/Upgrade Option</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What is this product and why do you use it?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Benefits (comma-separated)</Label>
              <Input
                placeholder="e.g., Lasts longer, Less maintenance, Better protection"
                value={formBenefits}
                onChange={(e) => setFormBenefits(e.target.value)}
              />
            </div>

            {formIsPremium && (
              <div className="space-y-2">
                <Label>Price Range (upgrade cost)</Label>
                <Input
                  placeholder="e.g., $50-$100 additional"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Related Services (comma-separated)</Label>
              <Input
                placeholder="e.g., Full Detail, Paint Correction, Color Treatment"
                value={formServices}
                onChange={(e) => setFormServices(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Usage Instructions (aftercare)</Label>
              <Textarea
                placeholder="e.g., Wait 24 hours before washing, avoid direct sunlight..."
                value={formUsage}
                onChange={(e) => setFormUsage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Warnings/Precautions</Label>
              <Input
                placeholder="e.g., Not suitable for sensitive skin, avoid if pregnant"
                value={formWarnings}
                onChange={(e) => setFormWarnings(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Upsell Script (how AI should mention this)</Label>
              <Textarea
                placeholder="e.g., For an additional $50, we can apply our ceramic coating which protects your paint for up to 2 years..."
                value={formUpsell}
                onChange={(e) => setFormUpsell(e.target.value)}
                rows={2}
              />
            </div>

            {formName && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={formUpsell || getAIPreview()} 
                className="mt-4"
                compact 
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
