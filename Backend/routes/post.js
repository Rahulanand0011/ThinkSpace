import express from 'express';
import { 
    addComment, 
    addPost, 
    addReaction, 
    deleteComment, 
    editComment, 
    editPost, 
    getAllPost, 
    getFeedPosts, 
    getSinglePost, 
    handleVisibility, 
    removePost, 
    toggleLikePost,
    uploadPostImage 
} from '../controller/post.js';
import userAuthentication from '../middleware/userAuthentication.js';
import optionalUserAuth from '../middleware/optionalUserAuth.js';
import uploadFile from '../middleware/uploadFile.js';

const post = express.Router();

// FEED & DISCOVERY
post.get("/feed", optionalUserAuth, getFeedPosts);

// USER POSTS & DETAILS
post.get("/", userAuthentication, getAllPost);
post.get("/:postId", optionalUserAuth, getSinglePost);

// CREATE & EDIT POSTS
post.post("/", userAuthentication, addPost);
post.post("/upload-image", userAuthentication, uploadFile.single("image"), uploadPostImage);
post.patch("/:postId", userAuthentication, editPost);
post.delete("/:postId", userAuthentication, removePost);
post.patch("/change-visibility/:postId", userAuthentication, handleVisibility);

// LIKES & REACTIONS
post.post("/:postId/like", userAuthentication, toggleLikePost);
post.post("/:postId/reaction", userAuthentication, addReaction);

// COMMENTS
post.post("/:postId/comment", userAuthentication, addComment);
post.patch("/:postId/comment/:commentId", userAuthentication, editComment);
post.delete("/:postId/comment/:commentId", userAuthentication, deleteComment);

export default post;