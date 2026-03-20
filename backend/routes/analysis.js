const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { analyzeImage, analyzeVideo, analyzeDocument, analyzeAudio } = require("../analysis/ai_engine");
const cloudinary = require("cloudinary").v2;
const AnalysisHistory = require("../models/AnalysisHistory");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "analysis");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory-based job queue for local status tracking
const analysisJobs = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filenames
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

/**
 * POST /api/analysis/media
 * Expects formData:
 * - file: The actual file (video, image, document, audio)
 * - entryId: ID of the entry being analyzed
 * - domain: craft, agriculture, health, etc.
 * - mediaType: (Optional) derived from mimetype if not provided
 */
router.post("/media", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        console.log("Analysis request received for file:", filePath);

        const entryId = req.body.entryId || "unknown_entry";
        const domain = req.body.domain || "general";
        
        // Determine media type based on mimetype with strict extension-first routing
        let mediaType = req.body.mediaType;
        if (!mediaType) {
            const mimetype = req.file.mimetype;
            const ext = path.extname(req.file.originalname).toLowerCase();
            
            // Hard whitelist for documents
            if ([".txt", ".pdf", ".docx", ".doc"].includes(ext)) {
                mediaType = "document";
            } 
            // Hard whitelist for audio
            else if (mimetype.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".ogg", ".flac"].includes(ext)) {
                mediaType = "audio";
            }
            // Video (priority over image for common container confusion)
            else if (mimetype.startsWith("video/") || [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) {
                mediaType = "video";
            } 
            // Image
            else if (mimetype.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
                mediaType = "image";
            } 
            else {
                mediaType = "document"; // final fallback
            }
        }
        console.log(`[Router] Routed Payload: ${req.file.originalname} -> Type: ${mediaType} (Mime: ${req.file.mimetype})`);

        // To comply with React frontend's polling expectations
        // the best approach in production is asynchronous processing.
        // For local testing, we'll await it directly, but still return a mock job format if needed, 
        // OR return the final done state immediately depending on how the frontend handles it.
        // Frontend polling checks: job.status === 'done'

        // We run it synchronously for local dev:
        console.log(`Starting Native JS analysis [type=${mediaType}, domain=${domain}, topic=${entryId}]...`);
        let result = {};
        if (mediaType === "video") result = await analyzeVideo(filePath, domain, entryId);
        else if (mediaType === "image") result = await analyzeImage(filePath, domain, entryId);
        else if (mediaType === "audio") result = await analyzeAudio(filePath, domain, entryId);
        else result = await analyzeDocument(filePath, domain, entryId);
        
        console.log("Native JS analysis completed successfully!");

        // Upload to Cloudinary
        let cloudUrl = "";
        try {
            console.log(`[Cloudinary] Uploading temporary local file...`);
            const uploadRes = await cloudinary.uploader.upload(filePath, { resource_type: "auto", folder: "living_memory_analysis" });
            cloudUrl = uploadRes.secure_url;
            console.log(`[Cloudinary] Upload success: ${cloudUrl}`);
        } catch(cErr) {
            console.error("Cloudinary upload failed, using local fallback:", cErr);
            cloudUrl = `/uploads/analysis/${req.file.filename}`;
        }

        // Delete temporary file safely after processing to save disk space
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch(delErr) { console.error("Could not delete local file", delErr); }

        // Save to MongoDB
        const analysisRecord = new AnalysisHistory({
            entryId,
            domain,
            type: mediaType,
            fileUrl: cloudUrl,
            filename: req.file.filename,
            result: result
        });
        await analysisRecord.save();

        // Store in memory for immediate polling access
        const jobId = `job_${Date.now()}`;
        analysisJobs.set(jobId, {
            status: "done",
            progress: 100,
            result: {
                ...result,
                fileUrl: cloudUrl,
                filename: req.file.filename,
                type: mediaType,
                analyzed_at: analysisRecord.analyzed_at,
                entryId: entryId,
                domain: domain
            }
        });

        res.json({ jobId: jobId });

    } catch (err) {
        console.error("Analysis Failed:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analysis/status/:jobId

/**
 * GET /api/analysis/status/:jobId
 * Used by the frontend to poll progress.
 */
router.get("/status/:jobId", (req, res) => {
    const job = analysisJobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
});

/**
 * GET /api/analysis/:title
 * Returns real history by querying MongoDB AnalysisHistory.
 */
router.get("/:title", async (req, res) => {
    try {
        const title = req.params.title;
        const historyDocs = await AnalysisHistory.find({ entryId: title }).sort({ analyzed_at: -1 }).lean();
        
        // Map to match frontend expectations:
        const history = historyDocs.map(doc => ({
            ...(doc.result || {}),
            fileUrl: doc.fileUrl,
            filename: doc.filename,
            type: doc.type,
            analyzed_at: doc.analyzed_at,
            entryId: doc.entryId,
            domain: doc.domain
        }));
        
        res.json(history);
    } catch (err) {
        console.error("Failed to load history from DB:", err);
        res.json([]);
    }
});

module.exports = router;
