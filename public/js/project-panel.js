(() => {
  const tabs = [...document.querySelectorAll('[data-panel-tab]')];
  const views = [...document.querySelectorAll('[data-panel-view]')];
  if (!tabs.length || !views.length) return;

  function showView(name, moveFocus = false) {
    tabs.forEach((tab) => {
      const selected = tab.dataset.panelTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    views.forEach((view) => {
      const selected = view.dataset.panelView === name;
      view.hidden = !selected;
      if (selected) view.scrollTop = 0;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showView(tab.dataset.panelTab));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      showView(tabs[next].dataset.panelTab, true);
    });
  });

  showView('overview');

  const captureLinks = document.querySelector('#capture-links');
  if (captureLinks) {
    fetch('/api/nd3', { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Archive request returned ${response.status}`);
        return response.json();
      })
      .then((records) => {
        if (!Array.isArray(records)) throw new Error('Archive returned an invalid response');
        records.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        captureLinks.replaceChildren();
        records.forEach((record, index) => {
          const meta = record.meta || {};
          const processedPath = String(meta.processedPath || '').replace(/\/+$/, '');
          const folder = processedPath.split('/').pop();
          const folderMarker = '/watch/processed/';
          const relativeFolder = processedPath.includes(folderMarker)
            ? processedPath.slice(processedPath.indexOf(folderMarker) + folderMarker.length).split('/')[0]
            : folder;
          if (!relativeFolder) return;

          if (index > 0 && captureLinks.childElementCount) {
            const separator = document.createElement('span');
            separator.className = 'capture-link-separator';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = '·';
            captureLinks.append(separator);
          }
          const link = document.createElement('a');
          const originalName = String(meta.originalFileName || record.originalFileName || relativeFolder);
          link.href = `/?nd3=${encodeURIComponent(relativeFolder)}`;
          link.className = 'capture-sample-link';
          link.textContent = originalName.replace(/\.[^.]+$/, '').replace(/-\d{10,}$/, '').replace(/_/g, ' · ');
          link.title = originalName;
          captureLinks.append(link);
        });
        if (!captureLinks.childElementCount) {
          const status = document.createElement('span');
          status.className = 'capture-links-status';
          status.textContent = 'NO CAPTURE RECORDS';
          captureLinks.append(status);
        }
      })
      .catch(() => {
        captureLinks.replaceChildren();
        const status = document.createElement('span');
        status.className = 'capture-links-status';
        status.textContent = 'CAPTURE INDEX UNAVAILABLE';
        captureLinks.append(status);
      });
  }
})();
