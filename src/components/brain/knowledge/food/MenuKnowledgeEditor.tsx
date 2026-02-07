/**
 * Menu Knowledge Editor (Food Mode)
 * 
 * Allows food businesses to add detailed descriptions, ingredients, allergens,
 * and pairing suggestions for menu items.
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
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed, Loader2, Flame, Leaf, Star } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface MenuKnowledge {
  id: string;
  tenant_id: string;
  item_name: string;
  detailed_description: string | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  prep_notes: string | null;
  pairing_suggestions: string | null;
  chef_notes: string | null;
  calorie_count: number | null;
  spice_level: number | null;
  is_signature: boolean;
  is_seasonal: boolean;
  seasonal_availability: string | null;
  created_at: string;
}

const COMMON_ALLERGENS = ["Dairy", "Eggs", "Fish", "Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soy", "Sesame"];
const DIETARY_TAGS = ["Vegetarian", "Vegan", "Gluten-Free", "Keto", "Halal", "Kosher", "Dairy-Free", "Nut-Free"];

export function MenuKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<MenuKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuKnowledge | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIngredients, setFormIngredients] = useState("");
  const [formAllergens, setFormAllergens] = useState<string[]>([]);
  const [formDietaryTags, setFormDietaryTags] = useState<string[]>([]);
  const [formPrepNotes, setFormPrepNotes] = useState("");
  const [formPairings, setFormPairings] = useState("");
  const [formChefNotes, setFormChefNotes] = useState("");
  const [formCalories, setFormCalories] = useState<number | null>(null);
  const [formSpiceLevel, setFormSpiceLevel] = useState(0);
  const [formIsSignature, setFormIsSignature] = useState(false);
  const [formIsSeasonal, setFormIsSeasonal] = useState(false);
  const [formSeasonalAvail, setFormSeasonalAvail] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("menu_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("is_signature", { ascending: false });
    if (!error) setItems((data as MenuKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormName("");
    setFormDescription("");
    setFormIngredients("");
    setFormAllergens([]);
    setFormDietaryTags([]);
    setFormPrepNotes("");
    setFormPairings("");
    setFormChefNotes("");
    setFormCalories(null);
    setFormSpiceLevel(0);
    setFormIsSignature(false);
    setFormIsSeasonal(false);
    setFormSeasonalAvail("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: MenuKnowledge) => {
    setEditingItem(item);
    setFormName(item.item_name);
    setFormDescription(item.detailed_description || "");
    setFormIngredients(item.ingredients?.join(", ") || "");
    setFormAllergens(item.allergens || []);
    setFormDietaryTags(item.dietary_tags || []);
    setFormPrepNotes(item.prep_notes || "");
    setFormPairings(item.pairing_suggestions || "");
    setFormChefNotes(item.chef_notes || "");
    setFormCalories(item.calorie_count);
    setFormSpiceLevel(item.spice_level || 0);
    setFormIsSignature(item.is_signature);
    setFormIsSeasonal(item.is_seasonal);
    setFormSeasonalAvail(item.seasonal_availability || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        item_name: formName.trim(),
        detailed_description: formDescription.trim() || null,
        ingredients: formIngredients.split(",").map(s => s.trim()).filter(Boolean),
        allergens: formAllergens,
        dietary_tags: formDietaryTags,
        prep_notes: formPrepNotes.trim() || null,
        pairing_suggestions: formPairings.trim() || null,
        chef_notes: formChefNotes.trim() || null,
        calorie_count: formCalories,
        spice_level: formSpiceLevel,
        is_signature: formIsSignature,
        is_seasonal: formIsSeasonal,
        seasonal_availability: formIsSeasonal ? formSeasonalAvail.trim() : null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Menu item knowledge updated");
      } else {
        const { error } = await supabase
          .from("menu_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Menu item knowledge added");
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
        .from("menu_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Menu item knowledge deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const toggleTag = (tag: string, current: string[], setter: (tags: string[]) => void) => {
    if (current.includes(tag)) {
      setter(current.filter(t => t !== tag));
    } else {
      setter([...current, tag]);
    }
  };

  const getAIPreview = () => {
    if (!formName) return "";
    let preview = `Our ${formName}`;
    if (formIsSignature) preview = `Our signature ${formName}`;
    if (formDescription) preview += ` - ${formDescription}`;
    if (formDietaryTags.length > 0) preview += ` It's ${formDietaryTags.join(" and ").toLowerCase()}.`;
    if (formAllergens.length > 0) preview += ` Please note it contains ${formAllergens.join(", ").toLowerCase()}.`;
    if (formPairings) preview += ` I'd recommend pairing it with ${formPairings}.`;
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Menu Item Knowledge"
        description="Detailed information about dishes so your AI can describe them appetizingly and answer ingredient questions."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Item"
        emptyState={{
          icon: UtensilsCrossed,
          title: "No menu knowledge yet",
          description: "Add detailed descriptions, ingredients, and allergen info for your dishes.",
        }}
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              {item.is_signature && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              <span className="font-medium text-sm">{item.item_name}</span>
              {item.spice_level && item.spice_level > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: item.spice_level }).map((_, i) => (
                    <Flame key={i} className="h-3 w-3 text-red-500" />
                  ))}
                </div>
              )}
            </div>
            {item.detailed_description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{item.detailed_description}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.dietary_tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Leaf className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {item.allergens?.slice(0, 3).map(a => (
                <Badge key={a} variant="outline" className="text-xs text-orange-600 border-orange-300">
                  {a}
                </Badge>
              ))}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item Knowledge"}</DialogTitle>
            <DialogDescription>
              Add details your AI will use to describe and answer questions about this dish.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  placeholder="e.g., Truffle Risotto"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formIsSignature} onCheckedChange={setFormIsSignature} />
                  <Label className="text-sm">Signature Dish</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formIsSeasonal} onCheckedChange={setFormIsSeasonal} />
                  <Label className="text-sm">Seasonal</Label>
                </div>
              </div>
            </div>

            {formIsSeasonal && (
              <div className="space-y-2">
                <Label>Seasonal Availability</Label>
                <Input
                  placeholder="e.g., Summer only, Available Oct-Dec"
                  value={formSeasonalAvail}
                  onChange={(e) => setFormSeasonalAvail(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the dish appetizingly - how it looks, tastes, and what makes it special..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Ingredients (comma-separated)</Label>
              <Input
                placeholder="e.g., Arborio rice, truffle oil, parmesan, shallots"
                value={formIngredients}
                onChange={(e) => setFormIngredients(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Allergens</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map(allergen => (
                  <Badge
                    key={allergen}
                    variant={formAllergens.includes(allergen) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(allergen, formAllergens, setFormAllergens)}
                  >
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={formDietaryTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag, formDietaryTags, setFormDietaryTags)}
                  >
                    <Leaf className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Spice Level (0-5)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formSpiceLevel]}
                    onValueChange={([v]) => setFormSpiceLevel(v)}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-0.5 w-20">
                    {formSpiceLevel > 0 ? (
                      Array.from({ length: formSpiceLevel }).map((_, i) => (
                        <Flame key={i} className="h-4 w-4 text-red-500" />
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Not spicy</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Calories (optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 450"
                  value={formCalories || ""}
                  onChange={(e) => setFormCalories(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pairing Suggestions</Label>
              <Input
                placeholder="e.g., Pairs well with a crisp Pinot Grigio or our house salad"
                value={formPairings}
                onChange={(e) => setFormPairings(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Preparation Notes (internal)</Label>
              <Textarea
                placeholder="How is it prepared? Any special instructions for the kitchen..."
                value={formPrepNotes}
                onChange={(e) => setFormPrepNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Chef's Notes (what AI can mention)</Label>
              <Textarea
                placeholder="Special touches, story behind the dish, chef's recommendations..."
                value={formChefNotes}
                onChange={(e) => setFormChefNotes(e.target.value)}
                rows={2}
              />
            </div>

            {formName && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={getAIPreview()} 
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
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
