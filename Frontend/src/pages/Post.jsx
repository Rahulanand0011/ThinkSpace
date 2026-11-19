import { useParams, useNavigate, Link } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import {
  ThumbUp,
  Favorite,
  SentimentVeryDissatisfied,
  Facebook,
  Twitter,
  LinkedIn,
  WhatsApp,
  Print,
  Delete,
  Edit,
  ArrowBack,
  ChatBubbleOutline,
  BookmarkBorder,
  ContentCopy,
} from "@mui/icons-material";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  Avatar,
  Box,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Tooltip,
  Container,
} from "@mui/material";
import useThinkSpace from "../hooks/useThinkSpace";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
} from "react-share";
import { marked } from "marked";
import DOMPurify from "dompurify";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import NavBar from "../layouts/NavBar";
import Footer from "../layouts/Footer";

dayjs.extend(relativeTime);

const reactionsList = [
  { type: "like", icon: <ThumbUp fontSize="small" />, color: "#2563eb", label: "Like" },
  { type: "love", icon: <Favorite fontSize="small" />, color: "#e11d48", label: "Love" },
  { type: "angry", icon: <SentimentVeryDissatisfied fontSize="small" />, color: "#d97706", label: "Insightful" },
];

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

const Post = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const shareUrl = window.location.href;
  const {
    setLoadingStatus,
    setAlertBoxOpenStatus,
    setAlertSeverity,
    setAlertMessage,
  } = useThinkSpace();

  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const [editPostDialogOpen, setEditPostDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState("public");

  const token = Cookies.get(import.meta.env.VITE_TOKEN_KEY);
  const currentUserId = Cookies.get(import.meta.env.VITE_USER_KEY || "userId");
  const userRole = Cookies.get(import.meta.env.VITE_USER_ROLE);

  const cardRef = useRef();

  const renderMarkdown = (description) => {
    if (!description) return { __html: "" };
    const html = marked(description);
    return { __html: DOMPurify.sanitize(html, { ADD_TAGS: ["img"], ADD_ATTR: ["src", "alt", "width", "height"] }) };
  };

  const fetchPost = async () => {
    setPageLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}`,
        { headers }
      );
      if (response.data.status) {
        setPost(response.data.post);
        setEditTitle(response.data.post.title);
        setEditTags(response.data.post.tags ? response.data.post.tags.join(", ") : "");
        setEditDescription(response.data.post.description);
        setEditVisibility(response.data.post.visibility || "public");
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handlePrint = useReactToPrint({
    content: () => cardRef.current,
    documentTitle: post?.title || "ThinkSpace Post",
    removeAfterPrint: true,
    contentRef: cardRef,
  });

  const handleComment = async () => {
    if (!token) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("info");
      setAlertMessage("Please log in to leave a comment!");
      navigate("/login");
      return;
    }
    if (!commentText.trim()) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage("Comment cannot be empty");
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}/comment`,
        { comment: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.status) {
        setPost((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), response.data.comment],
        }));
        setCommentText("");
      }
    } catch (error) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(error.response?.data?.message || "Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!token) return;
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        setPost((prev) => ({
          ...prev,
          comments: prev.comments.filter((c) => c._id !== commentId),
        }));
      }
    } catch (error) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(error.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleSaveEditComment = async (commentId) => {
    if (!token || !editedCommentText.trim()) return;
    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}/comment/${commentId}`,
        { comment: editedCommentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        setPost((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c._id === commentId ? { ...c, comment: editedCommentText.trim() } : c
          ),
        }));
        setEditingCommentId(null);
      }
    } catch (error) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(error.response?.data?.message || "Failed to update comment");
    }
  };

  const handleReact = async (reactionType) => {
    if (!token) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("info");
      setAlertMessage("Please log in to react!");
      navigate("/login");
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}/reaction`,
        { reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.status) {
        fetchPost();
      }
    } catch (error) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(error.response?.data?.message || "Failed to update reaction");
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        setAlertBoxOpenStatus(true);
        setAlertSeverity("success");
        setAlertMessage("Post deleted successfully");
        navigate("/explore");
      }
    } catch (err) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(err.response?.data?.message || "Failed to delete post");
    }
  };

  const handleSavePostEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert("Title and description are required");
      return;
    }
    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}`,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          tags: editTags,
          visibility: editVisibility,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        setEditPostDialogOpen(false);
        fetchPost();
        setAlertBoxOpenStatus(true);
        setAlertSeverity("success");
        setAlertMessage("Post updated successfully!");
      }
    } catch (err) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage(err.response?.data?.message || "Failed to update post");
    }
  };

  const isPostAuthor =
    (currentUserId && post?.authorId && post.authorId.toString() === currentUserId.toString()) ||
    userRole === "admin";

  // Extract first image URL from markdown description for hero banner
  const extractHeroImage = (description) => {
    if (!description) return null;
    const match = description.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    return match ? match[1] : null;
  };

  const getBodyMarkdown = (description, heroImg) => {
    if (!description) return "";
    if (!heroImg) return description;
    // Strip the hero image from the markdown body to avoid displaying it twice
    return description.replace(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/, "").trim();
  };

  const totalReactions = post?.reactions?.length || 0;
  const heroImage = post ? extractHeroImage(post.description) : null;
  const readingTime = post?.description
    ? Math.max(1, Math.ceil(post.description.replace(/!\[.*?\]\(.*?\)/g, "").split(/\s+/).length / 200))
    : 1;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f0f4f8", display: "flex", flexDirection: "column" }}>
      <NavBar />

      {/* Global styles */}
      <style>{`
        @media print { .no-print { display: none !important; } }
        .post-body { font-family: 'Georgia', 'Times New Roman', serif; }
        .post-body h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 2.5rem 0 1rem; padding-bottom: 0.6rem; border-bottom: 3px solid #1b2e35; }
        .post-body h2 { font-size: 1.5rem; font-weight: 700; color: #1b2e35; margin: 2rem 0 0.75rem; padding-left: 0.75rem; border-left: 4px solid #0f766e; }
        .post-body h3 { font-size: 1.2rem; font-weight: 600; color: #1e293b; margin: 1.5rem 0 0.5rem; }
        .post-body p { margin-bottom: 1.4rem; line-height: 2; color: #374151; font-size: 1.08rem; }
        .post-body img { max-width: 100%; border-radius: 16px; margin: 2rem auto; display: block; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .post-body pre { background: #0d1117; color: #c9d1d9; padding: 1.5rem; border-radius: 12px; overflow-x: auto; margin: 1.75rem 0; font-size: 0.88rem; line-height: 1.7; border: 1px solid #30363d; }
        .post-body code { background: #f1f5f9; color: #0f766e; padding: 2px 8px; border-radius: 6px; font-size: 0.88em; font-family: 'JetBrains Mono', 'Fira Mono', monospace; border: 1px solid #e2e8f0; }
        .post-body pre code { background: none; color: inherit; padding: 0; border: none; }
        .post-body blockquote { border-left: 5px solid #0f766e; background: linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%); padding: 1.25rem 1.75rem; margin: 2rem 0; border-radius: 0 12px 12px 0; color: #064e3b; font-style: italic; box-shadow: 0 2px 8px rgba(15,118,110,0.08); }
        .post-body table { width: 100%; border-collapse: collapse; margin: 2rem 0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .post-body th { background: linear-gradient(135deg, #1b2e35, #2c4955); color: white; padding: 0.9rem 1.1rem; text-align: left; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.03em; }
        .post-body td { padding: 0.75rem 1.1rem; border-bottom: 1px solid #f1f5f9; color: #374151; }
        .post-body tr:last-child td { border-bottom: none; }
        .post-body tr:nth-child(even) td { background: #f8fafc; }
        .post-body ul, .post-body ol { padding-left: 1.75rem; margin-bottom: 1.4rem; }
        .post-body li { margin-bottom: 0.5rem; color: #374151; line-height: 1.9; }
        .post-body a { color: #0f766e; text-decoration: none; font-weight: 600; border-bottom: 1px solid #0f766e44; transition: border-color 0.2s; }
        .post-body a:hover { border-bottom-color: #0f766e; }
        .post-body hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 2.5rem 0; }
        .post-body strong { color: #111827; font-weight: 700; }
        .comment-bubble { transition: all 0.2s ease; }
        .comment-bubble:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .reaction-btn { transition: all 0.2s ease !important; }
        .reaction-btn:hover { transform: scale(1.05); }
      `}</style>

      {/* Hero Banner — full width if hero image exists */}
      {post && heroImage && (
        <Box
          sx={{
            width: "100%",
            height: { xs: 240, md: 420 },
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img
            src={heroImage}
            alt={post.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.parentElement.style.display = "none"; }}
          />
          {/* Gradient overlay */}
          <Box sx={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)"
          }} />
          {/* Title overlay on hero */}
          <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: { xs: 3, md: 5 } }}>
            <Container maxWidth="lg">
              {post.tags && post.tags.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.75 }}>
                  {post.tags.map((tag, idx) => (
                    <Chip key={idx}
                      label={tag.startsWith("#") ? tag : `#${tag}`}
                      size="small"
                      sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontWeight: 600, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)", fontSize: "0.75rem" }}
                    />
                  ))}
                </Stack>
              )}
              <Typography variant="h3" fontWeight={900}
                sx={{ color: "white", lineHeight: 1.25, fontSize: { xs: "1.6rem", md: "2.5rem" }, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                {post.title}
              </Typography>
            </Container>
          </Box>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Back Button */}
        <Button
          component={Link}
          to="/explore"
          startIcon={<ArrowBack />}
          className="no-print"
          sx={{
            mb: 3,
            color: "#1b2e35",
            fontWeight: 600,
            px: 2,
            py: 0.75,
            borderRadius: 2,
            "&:hover": { backgroundColor: "#e2e8f0" }
          }}
        >
          Back to Community Feed
        </Button>

        {pageLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
            <CircularProgress sx={{ color: "#1b2e35" }} size={48} />
            <Typography color="text.secondary" fontWeight={500}>Loading post...</Typography>
          </Box>
        ) : !post ? (
          <Card sx={{ p: 6, textAlign: "center", borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
            <Typography variant="h5" color="#1b2e35" fontWeight="bold">Post Not Found or Private</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This post may have been deleted or is marked as private.
            </Typography>
            <Button component={Link} to="/explore" variant="contained" sx={{ mt: 3, backgroundColor: "#1b2e35", borderRadius: 2 }}>
              Explore Other Posts
            </Button>
          </Card>
        ) : (
          <Box ref={cardRef} sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3.5, alignItems: "flex-start" }}>

            {/* ── MAIN ARTICLE ── */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Card sx={{
                borderRadius: 4,
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                border: "1px solid #e8edf2",
                overflow: "visible",
              }}>
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>

                  {/* Title — shown here if no hero image */}
                  {!heroImage && (
                    <Typography variant="h4" fontWeight={900}
                      sx={{ color: "#0f172a", mb: 2.5, lineHeight: 1.3, fontSize: { xs: "1.6rem", md: "2.1rem" } }}>
                      {post.title}
                    </Typography>
                  )}

                  {/* Tags — shown here if no hero image */}
                  {!heroImage && post.tags && post.tags.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 0.75 }}>
                      {post.tags.map((tag, idx) => (
                        <Chip key={idx}
                          label={tag.startsWith("#") ? tag : `#${tag}`}
                          size="small"
                          sx={{ backgroundColor: "#f0fdf4", color: "#15803d", fontWeight: 700, border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.78rem" }}
                        />
                      ))}
                    </Stack>
                  )}

                  {/* Author + Meta Row */}
                  <Box sx={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: 2, mb: 4,
                    pb: 3, borderBottom: "2px solid #f1f5f9"
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        src={post.authorImage ? `${import.meta.env.VITE_SERVER_ENDPOINT}/avatar/${post.authorImage}` : undefined}
                        sx={{ bgcolor: "#1b2e35", color: "#59e3a7", width: 56, height: 56, fontWeight: 800, fontSize: "1.3rem", border: "3px solid #e8edf2", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                      >
                        {post.author ? post.author.charAt(0).toUpperCase() : "U"}
                      </Avatar>
                      <Box>
                        <Link to={post.authorId ? `/users/${post.authorId}` : "#"} style={{ textDecoration: "none", color: "inherit" }}>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ "&:hover": { color: "#0f766e" }, transition: "color 0.2s", fontSize: "1rem" }}>
                            {post.author || "ThinkSpace Author"}
                          </Typography>
                        </Link>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          📅 {dayjs(post.createdAt).format("MMMM D, YYYY")}
                          <span style={{ opacity: 0.4 }}>•</span>
                          📖 {readingTime} min read
                          <span style={{ opacity: 0.4 }}>•</span>
                          🕐 {dayjs(post.createdAt).format("h:mm A")}
                          {post.visibility === "private" && <><span style={{ opacity: 0.4 }}>•</span> 🔒 Private</>}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      {/* Stats */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", backgroundColor: "#f8fafc", px: 1.5, py: 0.5, borderRadius: 2 }}>
                        <ThumbUp sx={{ fontSize: 14 }} />
                        <Typography variant="caption" fontWeight={700}>{totalReactions}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", backgroundColor: "#f8fafc", px: 1.5, py: 0.5, borderRadius: 2 }}>
                        <ChatBubbleOutline sx={{ fontSize: 14 }} />
                        <Typography variant="caption" fontWeight={700}>{post.comments?.length || 0}</Typography>
                      </Box>

                      {isPostAuthor && (
                        <Stack direction="row" spacing={1} className="no-print">
                          <Button size="small" startIcon={<Edit />} variant="outlined" onClick={() => setEditPostDialogOpen(true)}
                            sx={{ borderColor: "#cbd5e1", color: "#475569", borderRadius: 2, textTransform: "none", fontWeight: 600, "&:hover": { borderColor: "#1b2e35", color: "#1b2e35" } }}>
                            Edit
                          </Button>
                          <Button size="small" startIcon={<Delete />} variant="outlined" color="error" onClick={handleDeletePost}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                            Delete
                          </Button>
                        </Stack>
                      )}
                    </Box>
                  </Box>

                  {/* Post Body — Rendered Markdown */}
                  <Box
                    className="post-body"
                    dangerouslySetInnerHTML={renderMarkdown(getBodyMarkdown(post.description, heroImage))}
                    sx={{ mb: 2 }}
                  />

                  <Divider sx={{ my: 4, borderColor: "#f1f5f9", borderWidth: 2 }} />

                  {/* Share + Print Row */}
                  <Box className="no-print" sx={{
                    display: "flex", alignItems: "center", gap: 1.5, mb: 4,
                    p: 2.5, backgroundColor: "#f8fafc", borderRadius: 3, border: "1px solid #e8edf2",
                    flexWrap: "wrap"
                  }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#1b2e35" sx={{ mr: 0.5 }}>
                      📤 Share:
                    </Typography>
                    <FacebookShareButton url={shareUrl} quote={post.title}>
                      <Tooltip title="Share on Facebook">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#1877F2", color: "white", px: 1.5, py: 0.6, borderRadius: 2, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, "&:hover": { opacity: 0.9 } }}>
                          <Facebook sx={{ fontSize: 16 }} /> Facebook
                        </Box>
                      </Tooltip>
                    </FacebookShareButton>
                    <TwitterShareButton url={shareUrl} title={post.title}>
                      <Tooltip title="Share on Twitter">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#1DA1F2", color: "white", px: 1.5, py: 0.6, borderRadius: 2, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, "&:hover": { opacity: 0.9 } }}>
                          <Twitter sx={{ fontSize: 16 }} /> Twitter
                        </Box>
                      </Tooltip>
                    </TwitterShareButton>
                    <LinkedinShareButton url={shareUrl} title={post.title}>
                      <Tooltip title="Share on LinkedIn">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#0077B5", color: "white", px: 1.5, py: 0.6, borderRadius: 2, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, "&:hover": { opacity: 0.9 } }}>
                          <LinkedIn sx={{ fontSize: 16 }} /> LinkedIn
                        </Box>
                      </Tooltip>
                    </LinkedinShareButton>
                    <WhatsappShareButton url={shareUrl} title={post.title}>
                      <Tooltip title="Share on WhatsApp">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "#25D366", color: "white", px: 1.5, py: 0.6, borderRadius: 2, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, "&:hover": { opacity: 0.9 } }}>
                          <WhatsApp sx={{ fontSize: 16 }} /> WhatsApp
                        </Box>
                      </Tooltip>
                    </WhatsappShareButton>
                    <Tooltip title="Copy Link to Clipboard">
                      <IconButton size="small" onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setAlertBoxOpenStatus(true);
                        setAlertSeverity("success");
                        setAlertMessage("Post link copied to clipboard!");
                      }} sx={{ color: "#64748b", backgroundColor: "white", border: "1px solid #e2e8f0", "&:hover": { backgroundColor: "#f1f5f9" } }}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print Article">
                      <IconButton size="small" onClick={handlePrint}
                        sx={{ color: "#64748b", backgroundColor: "white", border: "1px solid #e2e8f0", ml: { xs: 0, sm: "auto" }, "&:hover": { backgroundColor: "#f1f5f9" } }}>
                        <Print fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Reaction Buttons */}
                  <Box className="no-print" sx={{ mb: 5 }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#1b2e35" sx={{ mb: 2, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 1 }}>
                      ✨ React to this post
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                      {reactionsList.map((reaction) => {
                        const count = post.reactions ? post.reactions.filter((r) => r.reaction === reaction.type).length : 0;
                        return (
                          <Button
                            key={reaction.type}
                            className="reaction-btn"
                            variant={count > 0 ? "contained" : "outlined"}
                            startIcon={reaction.icon}
                            onClick={() => handleReact(reaction.type)}
                            sx={{
                              borderRadius: 20,
                              px: 2.5, py: 0.9,
                              textTransform: "none",
                              fontWeight: 700,
                              borderColor: count > 0 ? reaction.color : "#e2e8f0",
                              color: count > 0 ? "white" : reaction.color,
                              backgroundColor: count > 0 ? reaction.color : "transparent",
                              "&:hover": { backgroundColor: count > 0 ? reaction.color : `${reaction.color}15`, borderColor: reaction.color },
                              boxShadow: count > 0 ? `0 4px 14px ${reaction.color}40` : "none"
                            }}
                          >
                            {reaction.label} {count > 0 && `(${count})`}
                          </Button>
                        );
                      })}
                    </Stack>
                  </Box>

                  {/* Comments Section */}
                  <Box className="no-print">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: "#1b2e35" }}>
                        💬 Comments
                      </Typography>
                      <Chip label={post.comments?.length || 0} size="small"
                        sx={{ backgroundColor: "#1b2e35", color: "white", fontWeight: 700, minWidth: 32 }} />
                    </Box>

                    {/* Comment Input */}
                    <Box sx={{
                      display: "flex", gap: 2, mb: 4, alignItems: "flex-start",
                      p: 2.5, backgroundColor: "#f8fafc", borderRadius: 3, border: "1px solid #e8edf2"
                    }}>
                      <Avatar sx={{ bgcolor: "#1b2e35", color: "#59e3a7", width: 42, height: 42, fontSize: "1rem", fontWeight: 700, flexShrink: 0 }}>
                        {currentUserId ? "U" : "?"}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Share your thoughts or ask a question..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          multiline
                          minRows={2}
                          sx={{
                            backgroundColor: "white",
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2.5,
                              "&:hover fieldset": { borderColor: "#1b2e35" },
                              "&.Mui-focused fieldset": { borderColor: "#1b2e35", borderWidth: 2 }
                            }
                          }}
                        />
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
                          <Button
                            variant="contained"
                            onClick={handleComment}
                            size="small"
                            sx={{
                              background: "linear-gradient(135deg, #1b2e35, #2c4955)",
                              color: "white",
                              px: 3, py: 0.9,
                              borderRadius: 2.5,
                              textTransform: "none",
                              fontWeight: 700,
                              boxShadow: "0 4px 12px rgba(27,46,53,0.3)",
                              "&:hover": { background: "linear-gradient(135deg, #2c4955, #3d6070)", boxShadow: "0 6px 18px rgba(27,46,53,0.4)" }
                            }}
                          >
                            Post Comment
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Comments List */}
                    <Stack spacing={2}>
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment) => {
                          const isCommentAuthor = currentUserId && comment.commenter_id && comment.commenter_id.toString() === currentUserId.toString();
                          const canDelete = isCommentAuthor || isPostAuthor;

                          return (
                            <Box
                              key={comment._id}
                              className="comment-bubble"
                              sx={{
                                display: "flex",
                                gap: 2,
                                p: 2.5,
                                backgroundColor: "white",
                                borderRadius: 3,
                                border: "1px solid #e8edf2",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                              }}
                            >
                              <Avatar
                                src={comment.commenter_image ? `${import.meta.env.VITE_SERVER_ENDPOINT}/avatar/${comment.commenter_image}` : undefined}
                                sx={{ bgcolor: "#334155", width: 40, height: 40, fontSize: "0.9rem", fontWeight: 700, flexShrink: 0, border: "2px solid #f1f5f9" }}
                              >
                                {comment.commenter ? comment.commenter.charAt(0).toUpperCase() : "U"}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Link to={comment.commenter_id ? `/users/${comment.commenter_id}` : "#"} style={{ textDecoration: "none", color: "inherit" }}>
                                      <Typography variant="subtitle2" fontWeight={800} sx={{ "&:hover": { color: "#0f766e" }, transition: "color 0.2s" }}>
                                        {comment.commenter || "Member"}
                                      </Typography>
                                    </Link>
                                    <Typography variant="caption" color="text.secondary" sx={{ backgroundColor: "#f1f5f9", px: 1, py: 0.25, borderRadius: 1, fontSize: "0.7rem" }}>
                                      {dayjs(comment.createdAt).fromNow()}
                                    </Typography>
                                  </Box>
                                  {canDelete && (
                                    <Box sx={{ display: "flex", gap: 0.5 }}>
                                      {isCommentAuthor && editingCommentId !== comment._id && (
                                        <Tooltip title="Edit comment">
                                          <IconButton size="small" onClick={() => { setEditingCommentId(comment._id); setEditedCommentText(comment.comment); }}
                                            sx={{ color: "#94a3b8", "&:hover": { color: "#1b2e35", backgroundColor: "#f1f5f9" } }}>
                                            <Edit sx={{ fontSize: 15 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      <Tooltip title="Delete comment">
                                        <IconButton size="small" onClick={() => handleDeleteComment(comment._id)}
                                          sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444", backgroundColor: "#fef2f2" } }}>
                                          <Delete sx={{ fontSize: 15 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  )}
                                </Box>

                                {editingCommentId === comment._id ? (
                                  <Box sx={{ mt: 1 }}>
                                    <TextField fullWidth size="small" value={editedCommentText}
                                      onChange={(e) => setEditedCommentText(e.target.value)}
                                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                      <Button size="small" variant="contained" onClick={() => handleSaveEditComment(comment._id)}
                                        sx={{ backgroundColor: "#1b2e35", textTransform: "none", fontSize: "0.8rem", borderRadius: 1.5 }}>Save</Button>
                                      <Button size="small" color="inherit" onClick={() => setEditingCommentId(null)}
                                        sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: 1.5 }}>Cancel</Button>
                                    </Stack>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" sx={{ color: "#374151", lineHeight: 1.75, mt: 0.25 }}>
                                    {comment.comment}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })
                      ) : (
                        <Box sx={{ py: 6, textAlign: "center", backgroundColor: "#f8fafc", borderRadius: 3, border: "2px dashed #e2e8f0" }}>
                          <ChatBubbleOutline sx={{ fontSize: 48, color: "#cbd5e1", mb: 1.5 }} />
                          <Typography variant="body1" color="text.secondary" fontWeight={600}>No comments yet</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Be the first to start the conversation!</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* ── SIDEBAR ── */}
            <Box sx={{ width: { xs: "100%", lg: 310 }, flexShrink: 0 }} className="no-print">

              {/* Author Card */}
              <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #e8edf2", mb: 3, overflow: "hidden" }}>
                <Box sx={{
                  background: "linear-gradient(135deg, #1b2e35 0%, #2c4955 50%, #0f766e 100%)",
                  p: 3, textAlign: "center", position: "relative"
                }}>
                  <Box sx={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 50% 0%, white 0%, transparent 70%)" }} />
                  <Avatar
                    src={post.authorImage ? `${import.meta.env.VITE_SERVER_ENDPOINT}/avatar/${post.authorImage}` : undefined}
                    sx={{ bgcolor: "#0f766e", color: "white", width: 72, height: 72, fontSize: "1.75rem", fontWeight: 800, mx: "auto", mb: 1.5, border: "4px solid rgba(255,255,255,0.3)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
                  >
                    {post.author ? post.author.charAt(0).toUpperCase() : "U"}
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={800} color="white" sx={{ fontSize: "1.05rem" }}>{post.author || "Author"}</Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", mt: 0.25, display: "block" }}>ThinkSpace Member</Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  {post.authorBio && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.75, fontSize: "0.88rem" }}>
                      {post.authorBio}
                    </Typography>
                  )}
                  <Button
                    component={Link}
                    to={post.authorId ? `/users/${post.authorId}` : "#"}
                    fullWidth
                    variant="contained"
                    size="small"
                    sx={{
                      background: "linear-gradient(135deg, #1b2e35, #2c4955)",
                      color: "white",
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2.5,
                      py: 1,
                      boxShadow: "0 4px 12px rgba(27,46,53,0.25)",
                      "&:hover": { background: "linear-gradient(135deg, #2c4955, #3d6070)" }
                    }}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Tags Card */}
              {post.tags && post.tags.length > 0 && (
                <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e8edf2", p: 2.5, mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1b2e35" sx={{ mb: 2, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 1 }}>
                    🏷️ Topics Covered
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {post.tags.map((tag, idx) => (
                      <Chip
                        key={idx}
                        label={tag.startsWith("#") ? tag : `#${tag}`}
                        size="small"
                        sx={{ backgroundColor: "#f0fdf4", color: "#15803d", fontWeight: 700, border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.78rem", "&:hover": { backgroundColor: "#dcfce7" } }}
                      />
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Post Stats Card */}
              <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e8edf2", p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1b2e35" sx={{ mb: 2, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.1em" }}>
                  📊 Post Stats
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Total Reactions</Typography>
                    <Typography variant="body2" fontWeight={700} color="#1b2e35">{totalReactions}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Comments</Typography>
                    <Typography variant="body2" fontWeight={700} color="#1b2e35">{post.comments?.length || 0}</Typography>
                  </Box>
                  {reactionsList.map((r) => {
                    const count = post.reactions ? post.reactions.filter((rx) => rx.reaction === r.type).length : 0;
                    if (count === 0) return null;
                    return (
                      <Box key={r.type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <span style={{ color: r.color }}>{React.cloneElement(r.icon, { style: { fontSize: 14 } })}</span> {r.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: r.color }}>{count}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            </Box>
          </Box>
        )}
      </Container>

      <Footer />

      {/* Edit Post Dialog */}
      <Dialog open={editPostDialogOpen} onClose={() => setEditPostDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ background: "linear-gradient(135deg, #1b2e35, #2c4955)", color: "white", fontWeight: 800, fontSize: "1.1rem" }}>
          ✏️ Edit Post
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Post Title" fullWidth value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField label="Tags (comma-separated)" fullWidth value={editTags} onChange={(e) => setEditTags(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <FormControl fullWidth>
              <InputLabel>Visibility</InputLabel>
              <Select value={editVisibility} label="Visibility" onChange={(e) => setEditVisibility(e.target.value)}
                sx={{ borderRadius: 2 }}>
                <MenuItem value="public">🌍 Public (Community Feed)</MenuItem>
                <MenuItem value="private">🔒 Private (Only Me)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Description (Markdown supported)" fullWidth multiline rows={8}
              value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setEditPostDialogOpen(false)} color="inherit" sx={{ borderRadius: 2, textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePostEdit}
            sx={{ background: "linear-gradient(135deg, #1b2e35, #2c4955)", borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3, "&:hover": { background: "linear-gradient(135deg, #2c4955, #3d6070)" } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Post;
