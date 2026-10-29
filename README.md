# AKALL-NODE

AKALL-NODE is the application I/O server and browser archive for **AKALL (Azure Kinect à la Luna)**. AKALL is an RGB-D imaging project developed for planetary surface research. This repository supports reviewing lunar-analog captures made at the NASA Ames Lunar Lab, including image channels, depth and near-infrared data, and 3D point-cloud reconstructions.

The current site combines a project overview, a capture archive, and an interactive viewer. A capture can be opened from the archive or directly with a URL such as `/?nd3=<capture-folder>`. The viewer presents the associated images and PLY model in several layouts.

## What the application does

- Serves the AKALL project homepage and capture archive.
- Reads capture metadata from MongoDB and exposes it through a small REST API.
- Serves processed capture assets from `watch/processed/`.
- Watches `incoming/` for `.tar.gz` capture bundles, queues them, unpacks and converts image data, and can invoke the ND3 reconstruction executable to create PLY point clouds.
- Emits processing events through Socket.IO.
- Renders PLY files and capture images in the browser.

The repository contains application code and selected frontend assets. The full capture archive and MongoDB contents are runtime data and are not stored in Git; `watch/` is ignored by Git.

## Repository layout

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

## Run locally with Docker

Docker Desktop with Docker Compose is the recommended development setup. From the repository root:

```bash
docker compose up --build
```

Then open:

- Homepage: <http://localhost:3000/>
- Capture archive: <http://localhost:3000/dashboard>
- MongoDB is published only on `127.0.0.1:27017` for local tools.

The Compose setup runs the app with Nodemon, mounts `src/`, `public/`, `incoming/`, and `watch/processed/` from the working tree, and stores MongoDB data in the named `lunarlab_mongo_data` volume. Stop the services with `Ctrl-C`, or run `docker compose down`; the named database volume remains. To remove that volume as well, Docker Compose requires the separate `docker compose down --volumes` command, which deletes its stored database contents.

The Compose file uses local development values and placeholder ND3 paths. It is intended for working on the site and browsing captures already present in `watch/processed/`. The database starts empty unless you import or populate it; the processed files and MongoDB records need to correspond for the archive to list and open captures.

## Configuration and capture processing

The server reads these environment variables:

| Variable | Purpose | Default / local Compose value |
| --- | --- | --- |
| `PORT` | HTTP and Socket.IO listen port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/nd3_db` in direct Node config; Compose uses `mongodb://mongo:27017/nd3_db` |
| `INCOMING_DIR` | Directory watched for capture bundles | `/app/incoming` in Compose |
| `PROCESSED_DIR` | Destination for extracted captures | `/app/watch/processed` in Compose |
| `ND3_BINARY` | Path to the ND3 reconstruction executable | Compose placeholder: `/app/not-configured/nd3` |
| `CALIBRATION` | Path to the calibration file passed to ND3 | Compose placeholder: `/app/not-configured/calibration.json` |

To process new bundles, place a `.tar.gz` bundle in `incoming/`. The watcher waits for the file size to stabilize before queueing it. Processing extracts the bundle under `watch/processed/`, derives channel images and metadata, and attempts ND3 reconstruction. The conversion service invokes the ImageMagick `convert` command; full reconstruction also requires a compatible ND3 executable and calibration file. The checked-in Compose configuration does **not** include those tools or real ND3 paths, so configure and mount them before expecting new PLY files to be generated.

Do not put credentials in source files. `.env` is ignored by Git; provide private runtime configuration through the deployment environment or a local, untracked `.env` file.

## Useful routes

| Route | Description |
| --- | --- |
| `/` | Project homepage; a `?nd3=<capture-folder>` query opens the viewer |
| `/dashboard` | Capture archive |
| `/api/nd3` | List capture metadata records |
| `/api/nd3/:id` | Read one record by MongoDB ID |
| `/watch/processed/...` | Static access to processed capture assets |

## Development

For Node.js development outside Compose, install dependencies with `npm ci`. The package scripts are:

```bash
npm run dev
npm start
npm test
```

`npm run dev` uses Nodemon; `npm start` runs the server directly. A reachable MongoDB instance and the required directory/environment settings must be provided. ND3 ingestion additionally requires the image conversion utility and reconstruction assets described above.

The browser’s PLY renderer loads Three.js modules from jsDelivr, so rendering those models requires browser access to that CDN.

## Deployment note

The local Compose stack is for development and archival review. Production deployment is managed separately from this Compose file; check the host’s current process manager and reverse-proxy configuration before deploying or restarting anything. Do not assume a local image rebuild changes the production service.
