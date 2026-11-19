import mongoose from "mongoose";
import PostModel from "../models/postSchema.js";
import UserModel from "../models/userSchema.js";
import NotificationModel from "../models/notificationSchema.js";

const addPost = async (req, res) => {
    try {
        const { title, tags, description, visibility } = req.body;
        const authorId = req.user._id.toString();

        if (!title || !description) {
            return res.status(400).json({ status: false, message: "Title and description are required" });
        }

        const tagList = Array.isArray(tags) 
            ? tags 
            : (typeof tags === 'string' && tags.trim().length ? tags.split(',').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`) : []);

        const newPost = new PostModel({
            title: title.trim(),
            tags: tagList,
            description,
            visibility: visibility === "private" ? "private" : "public",
            authorId,
            createdAt: new Date(),
        });

        const savedPost = await newPost.save();
        if (savedPost) {
            return res.status(201).json({ status: true, message: "Post created successfully", post: savedPost });
        } else {
            return res.status(500).json({ status: false, message: "Something Went Wrong" });
        }
    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const removePost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const authorId = req.user._id.toString();

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ status: false, message: "Invalid Post ID" });
        }

        const post = await PostModel.findOne({ _id: postId });
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        // Enforce ownership (author or admin)
        if (post.authorId.toString() !== authorId && req.user.role !== "admin") {
            return res.status(403).json({ status: false, message: "You are not authorized to delete this post" });
        }

        await PostModel.findByIdAndDelete(postId);
        // Also remove related notifications
        await NotificationModel.deleteMany({ link: `/posts/${postId}` });

        return res.status(200).json({ status: true, message: "Post Deleted Successfully" });
    } catch (error) {
        console.error("Error removing post:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const editPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const authorId = req.user._id.toString();
        const { title, tags, description, visibility } = req.body;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ status: false, message: "Invalid Post ID" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        if (post.authorId.toString() !== authorId && req.user.role !== "admin") {
            return res.status(403).json({ status: false, message: "You are not authorized to edit this post" });
        }

        if (title !== undefined) post.title = title.trim();
        if (description !== undefined) post.description = description;
        if (visibility !== undefined) post.visibility = visibility === "private" ? "private" : "public";
        if (tags !== undefined) {
            post.tags = Array.isArray(tags) 
                ? tags 
                : (typeof tags === 'string' ? tags.split(',').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`) : post.tags);
        }

        const updatedPost = await post.save();
        return res.status(200).json({ status: true, message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        console.error("Error editing post:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Returns only the current user's posts (for "My Posts")
const getAllPost = async (req, res) => {
    try {
        const { limit, sort } = req.query;
        const authorId = req.user._id.toString();

        let postsQuery = PostModel.find({ authorId });

        if (sort === 'createdAt' || !sort) {
            postsQuery = postsQuery.sort({ createdAt: -1 });
        }

        if (limit) {
            postsQuery = postsQuery.limit(parseInt(limit));
        }

        const posts = await postsQuery;
        return res.status(200).json({ status: true, message: "Data Fetched Successfully", posts });
    } catch (error) {
        console.error("Error fetching user posts:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Global Community Feed (public posts from all users)
const getFeedPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? req.query.search.trim() : "";
        const sort = req.query.sort || "newest"; // "newest", "popular"

        const query = { visibility: "public" };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { tags: { $regex: search, $options: "i" } }
            ];
        }

        const totalPosts = await PostModel.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit) || 1;
        const skip = (page - 1) * limit;

        let posts = await PostModel.find(query)
            .populate("authorId", "fullName email image _id bio")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Format posts for feed response
        posts = posts.map(post => {
            const currentUserId = req.user ? req.user._id.toString() : null;
            const hasLiked = currentUserId 
                ? post.reactions.some(r => r.userId.toString() === currentUserId)
                : false;

            return {
                _id: post._id,
                title: post.title,
                description: post.description,
                tags: post.tags,
                visibility: post.visibility,
                createdAt: post.createdAt,
                author: post.authorId ? {
                    _id: post.authorId._id,
                    fullName: post.authorId.fullName,
                    email: post.authorId.email,
                    image: post.authorId.image,
                    bio: post.authorId.bio
                } : { fullName: "Anonymous" },
                likesCount: post.reactions ? post.reactions.length : 0,
                commentsCount: post.comments ? post.comments.length : 0,
                hasLiked
            };
        });

        // If sort by popular (likes count)
        if (sort === "popular") {
            posts.sort((a, b) => b.likesCount - a.likesCount);
        }

        return res.status(200).json({
            status: true,
            posts,
            totalPosts,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error("Error in getFeedPosts:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const getSinglePost = async (req, res) => {
    try {
        const { postId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ status: false, message: "Invalid Post ID" });
        }

        const post = await PostModel.findById(postId)
            .populate("authorId", "fullName email image _id bio")
            .populate("comments.userId", "fullName email image _id")
            .populate("reactions.userId", "fullName email image _id");

        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        // Privacy check
        if (post.visibility === "private") {
            const currentUserId = req.user ? req.user._id.toString() : null;
            const isAuthor = currentUserId && post.authorId && post.authorId._id.toString() === currentUserId;
            const isAdmin = req.user && req.user.role === "admin";

            if (!isAuthor && !isAdmin) {
                return res.status(403).json({ status: false, message: "This post is private and cannot be viewed." });
            }
        }

        const currentUserId = req.user ? req.user._id.toString() : null;
        const hasLiked = currentUserId 
            ? post.reactions.some(r => r.userId && r.userId._id.toString() === currentUserId)
            : false;

        const formattedPost = {
            _id: post._id,
            title: post.title,
            description: post.description,
            tags: post.tags,
            visibility: post.visibility,
            createdAt: post.createdAt,
            authorId: post.authorId ? post.authorId._id : null,
            author: post.authorId ? post.authorId.fullName : "Unknown",
            authorEmail: post.authorId ? post.authorId.email : "",
            authorImage: post.authorId ? post.authorId.image : null,
            authorBio: post.authorId ? post.authorId.bio : "",
            reactions: post.reactions.map(r => ({
                _id: r._id,
                reactor: r.userId ? r.userId.fullName : "User",
                reactor_id: r.userId ? r.userId._id : null,
                reactor_image: r.userId ? r.userId.image : null,
                reaction: r.reaction,
                createdAt: r.createdAt
            })),
            comments: post.comments.map(c => ({
                _id: c._id,
                comment: c.comment,
                commenter: c.userId ? c.userId.fullName : "User",
                commenter_id: c.userId ? c.userId._id : null,
                commenter_image: c.userId ? c.userId.image : null,
                createdAt: c.createdAt
            })),
            likesCount: post.reactions.length,
            commentsCount: post.comments.length,
            hasLiked
        };

        return res.status(200).json({ status: true, message: "Data Fetched Successfully", post: formattedPost });
    } catch (error) {
        console.error("Error fetching single post:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

// Toggle Like / Unlike (atomic and unique per user)
const toggleLikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ status: false, message: "Invalid Post ID" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        const existingIndex = post.reactions.findIndex(r => r.userId.toString() === userId.toString());

        if (existingIndex > -1) {
            // Already liked -> Unlike
            post.reactions.splice(existingIndex, 1);
            await post.save();
            return res.status(200).json({
                status: true,
                liked: false,
                likesCount: post.reactions.length,
                message: "Post unliked successfully"
            });
        } else {
            // Not liked -> Like
            post.reactions.push({ userId, reaction: "like", createdAt: new Date() });
            await post.save();

            // Create notification for post author (if not self)
            if (post.authorId.toString() !== userId.toString()) {
                await NotificationModel.create({
                    recipient: post.authorId,
                    sender: userId,
                    type: "like",
                    message: `${req.user.fullName} liked your post "${post.title.substring(0, 40)}"`,
                    link: `/posts/${postId}`
                });
            }

            return res.status(200).json({
                status: true,
                liked: true,
                likesCount: post.reactions.length,
                message: "Post liked successfully"
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { comment } = req.body;
        const userId = req.user._id;

        if (!comment || !comment.trim()) {
            return res.status(400).json({ status: false, message: "Comment cannot be empty" });
        }

        if (comment.trim().length > 1000) {
            return res.status(400).json({ status: false, message: "Comment cannot exceed 1000 characters" });
        }

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ status: false, message: "Invalid Post ID" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        const newComment = {
            _id: new mongoose.Types.ObjectId(),
            userId,
            comment: comment.trim(),
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await post.save();

        // Create notification for post author (if not self)
        if (post.authorId.toString() !== userId.toString()) {
            await NotificationModel.create({
                recipient: post.authorId,
                sender: userId,
                type: "comment",
                message: `${req.user.fullName} commented on your post "${post.title.substring(0, 40)}"`,
                link: `/posts/${postId}`
            });
        }

        return res.status(201).json({
            status: true,
            message: "Comment added successfully",
            comment: {
                _id: newComment._id,
                comment: newComment.comment,
                commenter: req.user.fullName,
                commenter_id: req.user._id,
                commenter_image: req.user.image,
                createdAt: newComment.createdAt
            }
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id.toString();

        if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ status: false, message: "Invalid IDs provided" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ status: false, message: "Comment not found" });
        }

        // Only comment author OR post author OR admin can delete
        const isCommentAuthor = comment.userId.toString() === userId;
        const isPostAuthor = post.authorId.toString() === userId;
        const isAdmin = req.user.role === "admin";

        if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
            return res.status(403).json({ status: false, message: "You are not authorized to delete this comment" });
        }

        post.comments.pull(commentId);
        await post.save();

        return res.status(200).json({ status: true, message: "Comment deleted successfully", commentId });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const editComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { comment: updatedText } = req.body;
        const userId = req.user._id.toString();

        if (!updatedText || !updatedText.trim()) {
            return res.status(400).json({ status: false, message: "Comment cannot be empty" });
        }

        if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ status: false, message: "Invalid IDs provided" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ status: false, message: "Comment not found" });
        }

        if (comment.userId.toString() !== userId && req.user.role !== "admin") {
            return res.status(403).json({ status: false, message: "You are not authorized to edit this comment" });
        }

        comment.comment = updatedText.trim();
        await post.save();

        return res.status(200).json({ status: true, message: "Comment updated successfully", comment });
    } catch (error) {
        console.error("Error editing comment:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const addReaction = async (req, res) => {
    try {
        const { postId } = req.params;
        const { reactionType } = req.body;
        const userId = req.user._id.toString();

        if (!reactionType) {
            return res.status(400).json({ status: false, message: "Reaction is required" });
        }

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        const existingReaction = post.reactions.find(reaction => reaction.userId.toString() === userId);
        if (existingReaction) {
            if (existingReaction.reaction === reactionType) {
                post.reactions = post.reactions.filter(reaction => reaction.userId.toString() !== userId);
                await post.save();
                return res.status(200).json({ status: true, message: "Reaction removed successfully" });
            } else {
                existingReaction.reaction = reactionType;
                await post.save();
                return res.status(200).json({ status: true, message: "Reaction updated successfully" });
            }
        }

        post.reactions.push({ userId, reaction: reactionType, createdAt: new Date() });
        await post.save();

        if (post.authorId.toString() !== userId) {
            await NotificationModel.create({
                recipient: post.authorId,
                sender: userId,
                type: "like",
                message: `${req.user.fullName} reacted to your post "${post.title.substring(0, 40)}"`,
                link: `/posts/${postId}`
            });
        }

        return res.status(201).json({ status: true, message: "Reaction added successfully" });
    } catch (error) {
        console.error("Error adding reaction:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const handleVisibility = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id.toString();

        const post = await PostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }

        if (post.authorId.toString() !== userId && req.user.role !== "admin") {
            return res.status(403).json({ status: false, message: "Unauthorized to modify this post" });
        }

        post.visibility = post.visibility === "public" ? "private" : "public";
        await post.save();

        return res.status(200).json({ status: true, message: "Visibility Updated Successfully", visibility: post.visibility });
    } catch (error) {
        console.error("Error handling visibility:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

const uploadPostImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: false, message: "No image file provided" });
        }
        const serverEndpoint = `${req.protocol}://${req.get("host")}/api/image/${req.file.filename}`;
        return res.status(200).json({
            status: true,
            message: "Image uploaded successfully",
            imageUrl: serverEndpoint,
            filename: req.file.filename
        });
    } catch (error) {
        console.error("Error uploading post image:", error);
        return res.status(500).json({ status: false, message: "Failed to upload image" });
    }
};

export { 
    addPost, 
    removePost, 
    editPost, 
    getAllPost, 
    getFeedPosts, 
    getSinglePost, 
    toggleLikePost, 
    addComment, 
    deleteComment, 
    editComment, 
    addReaction, 
    handleVisibility,
    uploadPostImage
};