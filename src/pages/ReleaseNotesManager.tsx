import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import VideoEmbedButton from "@/components/VideoEmbedButton";

interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
  level: number;
  parent_id?: string;
}

const ReleaseNotesManager = () => {
  const { productId, noteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [sections, setSections] = useState<Section[]>([
    { id: "1", title: "What's New", content: "", order: 0, level: 0 },
  ]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      if (noteId) {
        loadReleaseNote();
      }
    }
  }, [productId, noteId]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReleaseNote = async () => {
    try {
      const { data, error } = await supabase
        .from("release_notes")
        .select("*")
        .eq("id", noteId)
        .single();

      if (error) throw error;

      setTitle(data.title);
      setVersion(data.version || "");
      setStatus(data.status as "draft" | "published");
      if (data.content && Array.isArray(data.content)) {
        setSections(data.content as unknown as Section[]);
      }
    } catch (error) {
      console.error("Error loading release note:", error);
      toast({
        title: "Error",
        description: "Failed to load release note.",
        variant: "destructive",
      });
    }
  };

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: [] }, { background: [] }],
        ["link", "image", "video"],
        ["clean"],
      ],
    },
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "color",
    "background",
    "link",
    "image",
    "video",
  ];

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: "New Section",
      content: "",
      order: sections.length,
      level: 0,
    };
    setSections([...sections, newSection]);
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const updateSectionContent = (id: string, content: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please provide a title for the release note.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        product_id: productId,
        title: title.trim(),
        version: version.trim() || null,
        content: sections as any,
        status,
        created_by: profile?.id,
        ...(status === "published" && !noteId ? { published_at: new Date().toISOString() } : {}),
      };

      if (noteId) {
        const { error } = await supabase
          .from("release_notes")
          .update(noteData)
          .eq("id", noteId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Release note updated successfully.",
        });
      } else {
        const { error } = await supabase.from("release_notes").insert([noteData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Release note created successfully.",
        });

        navigate(`/product/${productId}/docs`);
      }
    } catch (error) {
      console.error("Error saving release note:", error);
      toast({
        title: "Error",
        description: "Failed to save release note.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/product/${productId}/docs`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {noteId ? "Edit" : "Create"} Release Note
                </h1>
                <p className="text-sm text-muted-foreground">{product?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsPreview(!isPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreview ? "Edit" : "Preview"}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save {status === "published" ? "& Publish" : "Draft"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Release Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Version 2.0 Release"
                    disabled={isPreview}
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., 2.0.0"
                    disabled={isPreview}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant={status === "draft" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus("draft")}
                    disabled={isPreview}
                  >
                    Draft
                  </Button>
                  <Button
                    variant={status === "published" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus("published")}
                    disabled={isPreview}
                  >
                    Published
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isPreview ? (
            <>
              {sections.map((section, index) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          updateSectionTitle(section.id, e.target.value)
                        }
                        className="text-lg font-semibold border-none shadow-none focus-visible:ring-0"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSection(section.id)}
                        disabled={sections.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ReactQuill
                      theme="snow"
                      value={section.content}
                      onChange={(content) =>
                        updateSectionContent(section.id, content)
                      }
                      modules={modules}
                      formats={formats}
                      className="bg-background"
                    />
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addSection} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">{title}</h1>
                  {version && (
                    <Badge variant="outline" className="text-sm">
                      Version {version}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h2 className="text-2xl font-semibold">{section.title}</h2>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReleaseNotesManager;
