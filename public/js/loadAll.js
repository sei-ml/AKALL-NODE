document.addEventListener('DOMContentLoaded', loadCaptureGrid);

async function loadCaptureGrid() {
  const container = document.getElementById('data-container');
  if (!container) return;

  try {
    const response = await fetch('/api/nd3', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Archive request returned ${response.status}`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Archive returned an invalid response');
    container.replaceChildren();

    if (!records.length) {
      container.append(makeArchiveMessage(
        'NO CAPTURE DATA',
        'LOCAL ARCHIVE / 00 RECORDS',
        'This local MongoDB is new and has no capture records yet. The research data from the online archive has not been copied into this local project.'
      ));
      return;
    }

    records.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    records.forEach((record, index) => container.append(makeCaptureCard(record, index)));
  } catch (error) {
    console.error('Could not load capture records:', error);
    container.replaceChildren(makeArchiveMessage(
      'ARCHIVE LINK DOWN',
      'DATABASE CONNECTION / UNAVAILABLE',
      'The local archive could not be reached. Check that both lunarlab containers are running, then reload.'
    ));
  }
}

function makeArchiveMessage(title, status, description) {
  const panel = document.createElement('section');
  panel.className = 'dashboard-state';
  const statusLine = document.createElement('div');
  statusLine.className = 'dashboard-state-status';
  statusLine.textContent = status;
  const heading = document.createElement('h1');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = description;
  const home = document.createElement('a');
  home.href = '/';
  home.textContent = '← RETURN TO LUNAR SURFACE';
  panel.append(statusLine, heading, copy, home);
  return panel;
}

function makeCaptureCard(record, index) {
  const meta = record.meta || {};
  const outputs = meta.outputs || {};
  const processedPath = String(meta.processedPath || '').replace(/\/+$/, '');
  const folder = processedPath.split('/').pop();
  const folderMarker = '/watch/processed/';
  const relativeFolder = processedPath.includes(folderMarker)
    ? processedPath.slice(processedPath.indexOf(folderMarker) + folderMarker.length).split('/')[0]
    : folder;
  const hasViewer = Boolean(relativeFolder);
  const url = hasViewer ? `/?nd3=${encodeURIComponent(relativeFolder)}` : '#';

  const card = document.createElement('article');
  card.className = 'card';

  const link = document.createElement('a');
  link.className = 'capture-card-link';
  if (hasViewer) link.href = url;
  link.setAttribute('aria-label', `Open ${meta.originalFileName || record.originalFileName || 'capture'} in the 3D viewer`);

  if (outputs.originalJPEG && relativeFolder) {
    const image = document.createElement('img');
    const filename = String(outputs.originalJPEG).split('/').map(encodeURIComponent).join('/');
    const originalImageUrl = `/watch/processed/${encodeURIComponent(relativeFolder)}/${filename}`;
    image.src = `/assets/capture-thumbnails/${encodeURIComponent(relativeFolder)}.jpg`;
    image.alt = '';
    image.loading = 'lazy';
    image.className = 'capture-thumb';
    image.addEventListener('error', () => {
      if (image.dataset.originalFallback) image.remove();
      else {
        image.dataset.originalFallback = 'true';
        image.src = originalImageUrl;
      }
    });
    link.append(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'capture-placeholder';
    placeholder.textContent = `FIELD RECORD / ${String(index + 1).padStart(3, '0')}`;
    link.append(placeholder);
  }

  const details = document.createElement('div');
  details.className = 'inner';
  const name = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = meta.originalFileName || record.originalFileName || 'UNTITLED CAPTURE';
  name.append(strong);
  const date = document.createElement('p');
  date.textContent = `DATE: ${meta.timestamp?.humanReadable || 'NOT RECORDED'}`;
  const command = document.createElement('p');
  command.textContent = `AKALL: ${meta.akallCommand || 'NOT RECORDED'}`;
  details.append(name, date, command);
  link.append(details);
  card.append(link);
  return card;
}
