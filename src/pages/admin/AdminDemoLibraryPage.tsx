import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, Play, Pause, Trash2, Save, 
  Music, CheckCircle, AlertCircle, Loader2 
} from "lucide-react";
import { useIndustryDemoAdmin, IndustryDemo } from "@/hooks/useIndustryDemos";
import { toast } from "sonner";

export default function AdminDemoLibraryPage() {
  const { demos, loading, updateDemo, uploadAudio, deleteAudio, refetch } = useIndustryDemoAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IndustryDemo>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<IndustryDemo | null>(null);

  const handleEdit = (demo: IndustryDemo) => {
    setEditingId(demo.id);
    setEditForm({
      title: demo.title,
      caption_bullets: demo.caption_bullets,
      transcript_excerpt: demo.transcript_excerpt || "",
      is_active: demo.is_active,
    });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateDemo(id, editForm);
      setEditingId(null);
      toast.success("Demo updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAudio = async (demo: IndustryDemo, file: File) => {
    setUploading(demo.id);
    try {
      const url = await uploadAudio(demo.industry_key, file);
      await updateDemo(demo.id, { audio_url: url });
      toast.success("Audio uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteAudio = async (demo: IndustryDemo) => {
    try {
      await deleteAudio(demo.industry_key);
      await updateDemo(demo.id, { audio_url: null });
      toast.success("Audio removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (demo: IndustryDemo) => {
    try {
      await updateDemo(demo.id, { is_active: !demo.is_active });
      toast.success(demo.is_active ? "Demo hidden" : "Demo visible");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateBullet = (index: number, value: string) => {
    const bullets = [...(editForm.caption_bullets || [])];
    bullets[index] = value;
    setEditForm({ ...editForm, caption_bullets: bullets });
  };

  const addBullet = () => {
    const bullets = [...(editForm.caption_bullets || []), ""];
    setEditForm({ ...editForm, caption_bullets: bullets });
  };

  const removeBullet = (index: number) => {
    const bullets = (editForm.caption_bullets || []).filter((_, i) => i !== index);
    setEditForm({ ...editForm, caption_bullets: bullets });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const triggerUpload = (demo: IndustryDemo) => {
    uploadTargetRef.current = demo;
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const demo = uploadTargetRef.current;
    if (file && demo) handleUploadAudio(demo, file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Single shared file input outside the loop */}
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        ref={fileInputRef}
        onChange={onFileSelected}
      />

      <div>
        <h1 className="text-2xl font-bold">Demo Library</h1>
        <p className="text-muted-foreground">
          Upload real call recordings for each industry demo on the home page.
        </p>
      </div>

      <div className="grid gap-6">
        {demos.map((demo) => (
          <Card key={demo.id} className={!demo.is_active ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{demo.title}</CardTitle>
                <Badge variant={demo.is_active ? "default" : "secondary"}>
                  {demo.is_active ? "Active" : "Hidden"}
                </Badge>
                <Badge variant="outline">{demo.industry_key}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={demo.is_active}
                  onCheckedChange={() => handleToggleActive(demo)}
                />
                {editingId !== demo.id && (
                  <Button variant="outline" size="sm" onClick={() => handleEdit(demo)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audio Section */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Music className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  {demo.audio_url ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Audio uploaded</span>
                      <audio controls className="h-8 max-w-xs">
                        <source src={demo.audio_url} />
                      </audio>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">No audio uploaded</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerUpload(demo)}
                    disabled={uploading === demo.id}
                  >
                    {uploading === demo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload
                  </Button>
                  {demo.audio_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAudio(demo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Edit Form */}
              {editingId === demo.id ? (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Caption Bullets (shown during playback)</Label>
                    <div className="space-y-2 mt-2">
                      {(editForm.caption_bullets || []).map((bullet, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={bullet}
                            onChange={(e) => updateBullet(i, e.target.value)}
                            placeholder={`Bullet ${i + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBullet(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addBullet}>
                        Add Bullet
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Transcript Excerpt (optional)</Label>
                    <Textarea
                      value={editForm.transcript_excerpt || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, transcript_excerpt: e.target.value })
                      }
                      placeholder='AI: "Hi, thanks for calling..."'
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(demo.id)} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Bullets:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {demo.caption_bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {demo.transcript_excerpt && (
                    <p className="mt-2 italic">"{demo.transcript_excerpt}"</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
