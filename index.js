import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

// Directories for videos and images
const videoDir = "./uploads/videos";
const imageDir = "./uploads/images";

// Create directories if they don't exist
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// Multer configuration for video files
const storageVideo = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir); // Save videos to the videoDir
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Unique video file name
  },
});

// Multer configuration for image files
const storageImage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir); // Save images to the imageDir
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Unique image file name
  },
});

// Multer upload handlers
const uploadVideo = multer({ storage: storageVideo });
const uploadImage = multer({ storage: storageImage });

// Route to upload video
app.post("/upload-video", uploadVideo.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No video uploaded.");
  }
  const videoUrl = `${req.protocol}://${req.get("host")}/videos/${
    req.file.filename
  }`;
  res.json({ videoUrl });
});

// Route to upload image
app.post("/upload-image", uploadImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No image uploaded.");
  }
  const photoUrl = `${req.protocol}://${req.get("host")}/images/${
    req.file.filename
  }`;
  res.json({ photoUrl });
});

// Route to delete a video file
app.delete("/delete-video/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(videoDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).send("Video file not found.");
      }
      return res
        .status(500)
        .send("An error occurred while trying to delete the video file.");
    }
    res.status(200).send("Video file deleted successfully.");
  });
});

// Route to delete an image file
app.delete("/delete-image/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(imageDir, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).send("Image file not found.");
      }
      return res
        .status(500)
        .send("An error occurred while trying to delete the image file.");
    }
    res.status(200).send("Image file deleted successfully.");
  });
});

app.get("/videos/:filename", (req, res) => {
  const filePath = path.join(videoDir, req.params.filename);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      return res.status(404).send("Video not found.");
    }

    const range = req.headers.range;
    if (!range) {
      // Nếu không có header range, gửi toàn bộ video
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Xử lý streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        return res.status(416).send("Requested range not satisfiable.");
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    }
  });
});

// Serve video files from the videoDir
app.use("/videos", express.static(path.join(process.cwd(), "uploads/videos")));

// Serve image files from the imageDir
app.use("/images", express.static(path.join(process.cwd(), "uploads/images")));

// Default route
app.get("/", (req, res) => res.status(200).json({ message: "Ok!" }));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
