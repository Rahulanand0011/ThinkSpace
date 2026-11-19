import {
  Box,
  TextField,
  Button,
  InputBase,
  Chip,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import SimpleMdeReact from "react-simplemde-editor";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "easymde/dist/easymde.min.css";
import useThinkSpace from "../hooks/useThinkSpace";
import axios from "axios";
import Cookies from "js-cookie";
import PublishIcon from '@mui/icons-material/Publish';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';

const PRESET_IMAGES = [
  { label: "AI & Machine Learning", url: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&auto=format&fit=crop&q=80" },
  { label: "Coding & Web Dev", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80" },
  { label: "Algorithms & Math", url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&auto=format&fit=crop&q=80" },
  { label: "Data Science & Python", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80" },
  { label: "Cybersecurity & Networks", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80" },
  { label: "Cloud & DevOps", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80" },
  { label: "Study & Productivity", url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80" },
];

const AddPost = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    setLoadingStatus,
    setAlertBoxOpenStatus,
    setAlertMessage,
    setAlertSeverity,
  } = useThinkSpace();

  const {
    handleSubmit,
    register,
    formState: { errors },
    setError,
    clearErrors,
    reset,
  } = useForm();

  const [tag, setTag] = useState("");
  const [tags, setTags] = useState([]);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [activeTab, setActiveTab] = useState(0); // 0 = Write, 1 = Preview

  // Image dialog states
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && tag.trim() !== "") {
      event.preventDefault();
      const trimmed = tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTag("");
      clearErrors("tags");
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
  };

  const renderMarkdown = () => {
    const html = marked(description || "*Nothing to preview yet. Start typing your post markdown above...*");
    return { __html: DOMPurify.sanitize(html, { ADD_TAGS: ["img"], ADD_ATTR: ["src", "alt", "width", "height"] }) };
  };

  // Insert image markdown snippet into description
  const insertImageMarkdown = (url, caption = "") => {
    const altText = caption.trim() || "Cover Image";
    const snippet = `\n![${altText}](${url})\n`;
    setDescription((prev) => (prev ? prev + snippet : snippet));
    setAlertBoxOpenStatus(true);
    setAlertSeverity("success");
    setAlertMessage("Image added to post! The first image becomes the hero banner.");
  };

  // Handle URL Dialog insert
  const handleInsertFromUrl = () => {
    if (!imageUrl.trim()) return;
    insertImageMarkdown(imageUrl.trim(), imageCaption);
    setImageUrl("");
    setImageCaption("");
    setUrlDialogOpen(false);
  };

  // Handle local file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage("Please select an image file (PNG, JPG, JPEG, WebP)");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploadingImage(true);
    try {
      const token = Cookies.get(import.meta.env.VITE_TOKEN_KEY);
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/upload-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.status && res.data.imageUrl) {
        insertImageMarkdown(res.data.imageUrl, file.name.replace(/\.[^/.]+$/, ""));
      } else {
        setAlertBoxOpenStatus(true);
        setAlertSeverity("error");
        setAlertMessage(res.data.message || "Failed to upload image");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(err.response?.data?.message || "Failed to upload image to server");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data) => {
    if (tags.length === 0) {
      setError("tags", {
        type: "manual",
        message: "Please add at least one tag (type a tag and press Enter)",
      });
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      setError("description", {
        type: "manual",
        message: "Post content / description cannot be empty",
      });
      return;
    }

    try {
      setLoadingStatus(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts`,
        {
          title: data.title.trim(),
          tags,
          description: trimmedDescription,
          visibility,
        },
        {
          headers: {
            Authorization: `Bearer ${Cookies.get(import.meta.env.VITE_TOKEN_KEY)}`,
          },
        }
      );

      if (response.data.status) {
        reset();
        setTags([]);
        setDescription("");
        setAlertBoxOpenStatus(true);
        setAlertSeverity("success");
        setAlertMessage("Post published successfully!");
        navigate("/my-post");
      } else {
        setAlertBoxOpenStatus(true);
        setAlertSeverity("error");
        setAlertMessage(response.data.message || "Failed to publish post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(error.response?.data?.message || error.message || "Something Went Wrong");
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b" }}>
          Create Academic Post ✍️
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
          Share notes, research summaries, and code snippets in Markdown with fellow students.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              {/* Title & Visibility row */}
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                <TextField
                  label="Post Title"
                  placeholder="e.g. Master-Theorem Explained with Solved Examples"
                  fullWidth
                  {...register("title", { required: "Title is required" })}
                  error={!!errors.title}
                  helperText={errors.title ? errors.title.message : ""}
                  sx={{ flex: 1 }}
                />

                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel id="visibility-label">Visibility</InputLabel>
                  <Select
                    labelId="visibility-label"
                    value={visibility}
                    label="Visibility"
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <MenuItem value="public">🌐 Public (Feed)</MenuItem>
                    <MenuItem value="private">🔒 Private (Only Me)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Tags Input */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>
                  Tags (Type tag & press Enter)
                </Typography>
                <Box
                  sx={{
                    border: "1px solid #cbd5e1",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                    backgroundColor: "#ffffff",
                    "&:focus-within": {
                      borderColor: "#0f766e",
                      boxShadow: "0 0 0 2px rgba(15, 118, 110, 0.15)"
                    }
                  }}
                >
                  {tags.map((item, index) => (
                    <Chip
                      key={index}
                      label={`#${item}`}
                      size="small"
                      sx={{
                        backgroundColor: "#0f766e",
                        color: "white",
                        fontWeight: 600,
                        "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.8)" }
                      }}
                      onDelete={() => handleRemoveTag(index)}
                    />
                  ))}

                  <InputBase
                    sx={{
                      flex: 1,
                      minWidth: "140px",
                      fontSize: "0.92rem",
                      padding: "2px"
                    }}
                    placeholder={tags.length === 0 ? "Type tag name and hit Enter..." : "Add another tag..."}
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </Box>
                {errors.tags && (
                  <Typography color="error" variant="caption" sx={{ mt: 0.5, display: "block" }}>
                    {errors.tags.message}
                  </Typography>
                )}
              </Box>

              {/* Image Insertion Helper Toolbar */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AddPhotoAlternateIcon sx={{ color: "#0f766e", fontSize: 24 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                      Add Post Image / Cover
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      First image in your post will automatically be featured as the hero banner
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  {/* Upload from Computer */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploadingImage ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      borderColor: "#0f766e",
                      color: "#0f766e",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      "&:hover": { backgroundColor: "rgba(15, 118, 110, 0.08)", borderColor: "#0f766e" },
                    }}
                  >
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </Button>

                  {/* Insert URL */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<InsertLinkIcon />}
                    onClick={() => setUrlDialogOpen(true)}
                    sx={{
                      borderColor: "#64748b",
                      color: "#334155",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      "&:hover": { backgroundColor: "#f1f5f9", borderColor: "#334155" },
                    }}
                  >
                    Insert Image URL
                  </Button>

                  {/* Stock / Presets */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CollectionsBookmarkIcon />}
                    onClick={() => setPresetDialogOpen(true)}
                    sx={{
                      borderColor: "#64748b",
                      color: "#334155",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: "8px",
                      "&:hover": { backgroundColor: "#f1f5f9", borderColor: "#334155" },
                    }}
                  >
                    Quick Cover Presets
                  </Button>
                </Stack>
              </Box>

              {/* Editor Tabs: Write vs Preview */}
              <Box>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                  <Tab icon={<EditNoteIcon />} iconPosition="start" label="Write Markdown" sx={{ textTransform: "none", fontWeight: 600 }} />
                  <Tab icon={<VisibilityIcon />} iconPosition="start" label="Live Preview" sx={{ textTransform: "none", fontWeight: 600 }} />
                </Tabs>

                {activeTab === 0 ? (
                  <Box>
                    <SimpleMdeReact
                      id="description"
                      value={description}
                      onChange={setDescription}
                      options={{
                        placeholder: "Write your study notes, tutorial, code snippets, or thoughts here...\n\nUse ![alt](image-url) to embed images directly!",
                        spellChecker: false,
                        minHeight: "320px",
                      }}
                    />
                    {errors.description && (
                      <Typography color="error" variant="caption">
                        {errors.description.message}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 3,
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      minHeight: "320px",
                      bgcolor: "#ffffff",
                      lineHeight: 1.8,
                      "& img": { maxWidth: "100%", borderRadius: "10px", my: 2, display: "block", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" },
                      "& pre": { bgcolor: "#0f172a", color: "#e2e8f0", p: 2, borderRadius: "8px", overflowX: "auto" }
                    }}
                    dangerouslySetInnerHTML={renderMarkdown()}
                  />
                )}
              </Box>

              <Divider />

              {/* Submit Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<PublishIcon />}
                  sx={{
                    px: 4,
                    py: 1.2,
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px",
                    bgcolor: "#0f766e",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(15, 118, 110, 0.2)",
                    "&:hover": { bgcolor: "#115e59" }
                  }}
                >
                  Publish Post
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {/* Insert Image from URL Dialog */}
      <Dialog open={urlDialogOpen} onClose={() => setUrlDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", pb: 1 }}>
          📷 Insert Image from URL
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a direct link to any image (from Unsplash, Imgur, GitHub, or any public image host).
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Image URL"
              placeholder="https://images.unsplash.com/photo-..."
              fullWidth
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              autoFocus
            />
            <TextField
              label="Image Caption / Alt Text (Optional)"
              placeholder="e.g. Neural Network Architecture Diagram"
              fullWidth
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
            />
            {imageUrl && (
              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Preview:
                </Typography>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setUrlDialogOpen(false)} sx={{ color: "#64748b", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInsertFromUrl}
            disabled={!imageUrl.trim()}
            sx={{
              bgcolor: "#0f766e",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { bgcolor: "#115e59" }
            }}
          >
            Insert Image
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Cover Presets Dialog */}
      <Dialog open={presetDialogOpen} onClose={() => setPresetDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", pb: 1 }}>
          🎨 Choose a Curated Cover Image
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Pick a high-resolution, royalty-free cover image tailored for computer science and academic topics:
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2 }}>
            {PRESET_IMAGES.map((preset, idx) => (
              <Card
                key={idx}
                onClick={() => {
                  insertImageMarkdown(preset.url, preset.label);
                  setPresetDialogOpen(false);
                }}
                sx={{
                  cursor: "pointer",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "#0f766e",
                    transform: "translateY(-3px)",
                    boxShadow: "0 6px 18px rgba(15, 118, 110, 0.18)"
                  }
                }}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  style={{ width: "100%", height: 110, objectFit: "cover" }}
                />
                <Box sx={{ p: 1.5, textAlign: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}>
                    {preset.label}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPresetDialogOpen(false)} sx={{ color: "#64748b", textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddPost;
