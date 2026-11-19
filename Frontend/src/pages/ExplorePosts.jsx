import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  Stack,
  Pagination,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useThinkSpace from "../hooks/useThinkSpace";
import NavBar from "../layouts/NavBar";
import Footer from "../layouts/Footer";

dayjs.extend(relativeTime);

const ExplorePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { setAlertBoxOpenStatus, setAlertMessage, setAlertSeverity } = useThinkSpace();
  const navigate = useNavigate();

  const token = Cookies.get(import.meta.env.VITE_TOKEN_KEY);

  const extractThumb = (desc) => {
    if (!desc) return null;
    const match = desc.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    return match ? match[1] : null;
  };

  const cleanExcerpt = (desc) => {
    if (!desc) return "";
    return desc
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[#*`_~>]/g, "")
      .trim();
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/feed?page=${page}&limit=8&search=${encodeURIComponent(search)}&sort=${sort}`,
        { headers }
      );
      if (res.data.status) {
        setPosts(res.data.posts);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const handleLike = async (postId) => {
    if (!token) {
      setAlertBoxOpenStatus(true);
      setAlertSeverity("info");
      setAlertMessage("Please log in to like posts!");
      navigate("/login");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_ENDPOINT}/posts/${postId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.data.status) {
        setPosts((prevPosts) =>
          prevPosts.map((p) => {
            if (p._id === postId) {
              return {
                ...p,
                hasLiked: res.data.liked,
                likesCount: res.data.likesCount
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error("Error liking post:", err);
      setAlertBoxOpenStatus(true);
      setAlertSeverity("error");
      setAlertMessage("Failed to update like status");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Header Banner */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 4,
            p: 3,
            borderRadius: 2,
            background: "linear-gradient(135deg, #1b2e35 0%, #2c4955 100%)",
            color: "white"
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "Platypi, sans-serif" }}>
              Community Thoughts & Articles 💡
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
              Discover insightful notes, tutorials, and reflections from learners worldwide.
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/add-post"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: "#59e3a7",
              color: "#1b2e35",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "#4cd195" },
              px: 3,
              py: 1.2
            }}
          >
            Create Post
          </Button>
        </Box>

        {/* Filter and Search Bar */}
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            flexWrap: "wrap",
            alignItems: "center",
            backgroundColor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}
        >
          <TextField
            placeholder="Search by title, tag, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: "240px" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#64748b" }} />
                </InputAdornment>
              )
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: "#1b2e35",
              color: "white",
              "&:hover": { backgroundColor: "#2c4955" }
            }}
          >
            Search
          </Button>
          <FormControl size="small" sx={{ minWidth: "150px" }}>
            <Select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="newest">🕒 Newest First</MenuItem>
              <MenuItem value="popular">🔥 Most Liked</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Posts Feed */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#1b2e35" }} />
          </Box>
        ) : posts.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              backgroundColor: "white",
              borderRadius: 2,
              p: 4
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No posts found.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Be the first one to share your thoughts with the ThinkSpace community!
            </Typography>
            <Button
              component={Link}
              to="/add-post"
              variant="contained"
              sx={{
                mt: 2,
                backgroundColor: "#1b2e35",
                color: "white",
                "&:hover": { backgroundColor: "#2c4955" }
              }}
            >
              Write a Post
            </Button>
          </Box>
        ) : (
          <Stack spacing={3}>
            {posts.map((post) => (
              <Card
                key={post._id}
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.1)"
                  }
                }}
              >
                <CardContent sx={{ pb: 1.5, p: { xs: 2.5, sm: 3 } }}>
                  {(() => {
                    const thumb = extractThumb(post.description);
                    return (
                      <Box sx={{ display: "flex", flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 2, sm: 3 }, justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {/* Author Header */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                            <Avatar
                              src={post.author?.image ? `${import.meta.env.VITE_SERVER_ENDPOINT}/avatar/${post.author.image}` : undefined}
                              sx={{
                                bgcolor: "#1b2e35",
                                color: "#59e3a7",
                                width: 40,
                                height: 40,
                                fontWeight: "bold"
                              }}
                            >
                              {post.author?.fullName ? post.author.fullName.charAt(0).toUpperCase() : "U"}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Link
                                to={post.author?._id ? `/users/${post.author._id}` : "#"}
                                style={{ textDecoration: "none", color: "inherit" }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                  noWrap
                                  sx={{
                                    "&:hover": { color: "#0f766e" }
                                  }}
                                >
                                  {post.author?.fullName || "ThinkSpace Member"}
                                </Typography>
                              </Link>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                                <AccessTimeIcon sx={{ fontSize: 13 }} />
                                <Typography variant="caption" sx={{ fontSize: "0.72rem" }}>
                                  {dayjs(post.createdAt).fromNow()}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {/* Post Title */}
                          <Link
                            to={`/posts/${post._id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              sx={{
                                mb: 1,
                                color: "#0f172a",
                                lineHeight: 1.35,
                                fontSize: { xs: "1.1rem", sm: "1.25rem" },
                                "&:hover": { color: "#0f766e" }
                              }}
                            >
                              {post.title}
                            </Typography>
                          </Link>

                          {/* Post Excerpt */}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.7,
                              color: "#475569"
                            }}
                          >
                            {cleanExcerpt(post.description)}
                          </Typography>

                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                              {post.tags.map((tag, idx) => (
                                <Chip
                                  key={idx}
                                  label={tag.startsWith("#") ? tag : `#${tag}`}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
                                    fontWeight: 600,
                                    fontSize: "0.72rem",
                                    borderRadius: "6px"
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>

                        {/* Thumbnail Image */}
                        {thumb && (
                          <Box
                            component={Link}
                            to={`/posts/${post._id}`}
                            sx={{
                              width: { xs: "100%", sm: 160, md: 180 },
                              height: { xs: 180, sm: 120 },
                              flexShrink: 0,
                              borderRadius: "12px",
                              overflow: "hidden",
                              display: "block",
                              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                              "&:hover img": { transform: "scale(1.06)" }
                            }}
                          >
                            <img
                              src={thumb}
                              alt={post.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
                              onError={(e) => { e.target.parentElement.style.display = "none"; }}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                </CardContent>

                {/* Card Actions: Likes, Comments, View Post */}
                <CardActions
                  sx={{
                    px: 2,
                    pb: 2,
                    pt: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid #f1f5f9"
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                    {/* Like Button */}
                    <Tooltip title={post.hasLiked ? "Unlike" : "Like"}>
                      <IconButton
                        onClick={() => handleLike(post._id)}
                        size="small"
                        sx={{
                          color: post.hasLiked ? "#e11d48" : "#64748b",
                          "&:hover": { color: "#e11d48" }
                        }}
                      >
                        {post.hasLiked ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                        <Typography variant="body2" sx={{ ml: 0.5, fontWeight: "bold" }}>
                          {post.likesCount}
                        </Typography>
                      </IconButton>
                    </Tooltip>

                    {/* Comments Count */}
                    <Box
                      component={Link}
                      to={`/posts/${post._id}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: "#64748b",
                        textDecoration: "none",
                        "&:hover": { color: "#1b2e35" }
                      }}
                    >
                      <ChatBubbleOutlineIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {post.commentsCount}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    component={Link}
                    to={`/posts/${post._id}`}
                    size="small"
                    sx={{
                      mt: 1,
                      color: "#1b2e35",
                      fontWeight: "bold",
                      textTransform: "none"
                    }}
                  >
                    Read Full Post →
                  </Button>
                </CardActions>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, val) => setPage(val)}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>
      <Footer />
    </Box>
  );
};

export default ExplorePosts;
