# AKALL-NODE

AKALL-NODE is the application I/O server and browser-based data archive for **AKALL (Azure Kinect à la Luna)**, an RGB-D imaging project developed for planetary surface research. The system supports analysis of lunar-analog observations acquired at the NASA Ames Lunar Lab. The capture products represented in this archive include visible image channels, depth and near-infrared imagery, metadata, and 3D point-cloud reconstructions.

The web interface comprises a project overview, a capture archive, and an interactive visualization client. Capture records can be selected from the archive or addressed directly with a URL such as `/?nd3=<capture-folder>`. The visualization client presents the associated imagery and PLY point cloud in multiple views.

**Live project site:** <https://lunar.doppellab.space/>

## System overview

- Delivers the project homepage, capture archive, and interactive data viewer over HTTP.
- Stores and retrieves capture metadata in MongoDB and exposes records through a JSON API.
- Serves processed capture products from `watch/processed/`.
- Monitors `incoming/` for compressed `.tar.gz` capture bundles, queues stable files, extracts the source data, derives image products, and can invoke the ND3 reconstruction executable to generate PLY point clouds.
- Publishes processing events through Socket.IO.
- Renders capture imagery and PLY point clouds in a WebGL-enabled browser.

The repository contains application code and selected frontend assets. The full capture archive and MongoDB records are runtime data and are not versioned in Git. The processed-data directory `watch/` is excluded from version control.

## Repository organization

```text
src/
  server.js                 Express and Socket.IO entry point
  routes/ controllers/       Capture metadata API
  models/                   MongoDB capture model
  services/                 File watcher, queue, conversion, reconstruction
  db/                       MongoDB connection
public/
  index.html                Project homepage
  all.html                  Capture archive
  viewer.html               Capture and PLY viewer
  js/                       Browser viewer, archive, and terrain code
  css/                      Site and viewer styles
  s1/                       Standalone research demos and legacy pages
incoming/                    Incoming .tar.gz bundles (local runtime data)
watch/processed/              Extracted and processed captures (runtime data)
compose.yaml                  Local app and MongoDB services
Dockerfile                    App image definition
```

## Local execution with Docker Compose

Docker Desktop with Docker Compose provides the local development environment. From the repository root, build and start the application and database services:

```bash
docker compose up --build
```

The local endpoints are:

- Homepage: <http://localhost:3000/>
- Capture archive: <http://localhost:3000/dashboard>
- MongoDB is published only on `127.0.0.1:27017` for local tools.

The Compose configuration runs the application with Nodemon, mounts `src/`, `public/`, `incoming/`, and `watch/processed/` from the working tree, and stores MongoDB data in the named `lunarlab_mongo_data` volume. Stop the services with `Ctrl-C` or `docker compose down`; the named database volume is retained. `docker compose down --volumes` also removes the database volume and its contents.

The Compose file specifies development values and placeholder ND3 paths. It supports interface development and visualization of captures already present in `watch/processed/`. MongoDB starts without capture records unless records are imported or created. Archive entries require corresponding metadata records and processed files to be available.

## Runtime configuration and processing pipeline

The server reads these environment variables:

| Variable | Purpose | Default / local Compose value |
| --- | --- | --- |
| `PORT` | HTTP and Socket.IO listen port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/nd3_db` in direct Node config; Compose uses `mongodb://mongo:27017/nd3_db` |
| `INCOMING_DIR` | Directory watched for capture bundles | `/app/incoming` in Compose |
| `PROCESSED_DIR` | Destination for extracted captures | `/app/watch/processed` in Compose |
| `ND3_BINARY` | Path to the ND3 reconstruction executable | Compose placeholder: `/app/not-configured/nd3` |
| `CALIBRATION` | Path to the calibration file passed to ND3 | Compose placeholder: `/app/not-configured/calibration.json` |

To process a new capture, place its `.tar.gz` bundle in `incoming/`. The file watcher waits for the bundle size to stabilize before submitting it to the processing queue. The pipeline extracts files under `watch/processed/`, derives image channels and metadata, and attempts ND3 reconstruction. Image conversion invokes ImageMagick's `convert` command. PLY generation additionally requires a compatible ND3 executable and calibration file. These tools and valid paths are not included in the checked-in Compose configuration; configure and mount them before processing new bundles for PLY output.

Do not put credentials in source files. `.env` is ignored by Git; provide private runtime configuration through the deployment environment or a local, untracked `.env` file.

## HTTP interfaces

| Route | Description |
| --- | --- |
| `/` | Project homepage; a `?nd3=<capture-folder>` query opens the viewer |
| `/dashboard` | Capture archive |
| `/api/nd3` | List capture metadata records |
| `/api/nd3/:id` | Read one record by MongoDB ID |
| `/watch/processed/...` | Static access to processed capture assets |

## Developer workflow

For Node.js development outside Compose, install dependencies with `npm ci`. The package scripts are:

```bash
npm run dev
npm start
npm test
```

`npm run dev` uses Nodemon; `npm start` runs the server directly. A reachable MongoDB instance and the required directory/environment settings must be provided. ND3 ingestion additionally requires the image conversion utility and reconstruction assets described above.

The browser’s PLY renderer loads Three.js modules from jsDelivr, so rendering those models requires browser access to that CDN.

## Licensing

Project-authored AKALL-NODE software is licensed under the Apache License 2.0; see [`LICENSE`](LICENSE). This permissive license includes an express patent grant and is one of the software licenses recommended by DevelopSpace. The package metadata identifies the same license.

The repository also contains research data products, capture-derived thumbnails, photographs, and third-party materials. The root software license does not establish reuse rights for those materials. They remain subject to their own notices, permissions, or applicable rights. In particular, `public/s1/HTML_attiude_indicator/` includes a separate GNU GPL v3 license. Review the relevant notices and obtain any needed permissions before redistributing non-software materials.

## Production deployment considerations

The Compose stack is intended for local development and archival review. Production deployment is managed independently of this Compose configuration. Confirm the host's process manager, application configuration, and reverse-proxy routing before deploying or restarting production services; rebuilding the local image does not update the production application.

## Acknowledgments

The AKALL project acknowledges the NASA Ames Lunar Lab, the Space Exploration Initiative at MIT, and [DevelopSpace](https://developspace.org/) for their support of this research.
