document.addEventListener("DOMContentLoaded", async function() {
    const container = document.getElementById("data-container");

    try {
        const response = await fetch("api/nd3"); 
        const data = await response.json();
        container.innerHTML = ""; 

        data.forEach(item => {
            const { meta } = item;
            const { timestamp, outputs } = meta;

            const basePath = meta.processedPath.split("/watch/processed/")[1];
            const relativePath = `/watch/processed/${basePath}/`;

            const imagePath = outputs.originalJPEG ? `${relativePath}${outputs.originalJPEG}` : "placeholder.jpg";
            const plyFile = outputs.nd3Reconstruction.length > 0 ? `${relativePath}${outputs.nd3Reconstruction[0].ply}` : "#";
            const nd3Link = `/?nd3=${meta.processedPath.split("/")[6]}`;

            const card = document.createElement("div");
            card.classList.add("card");

            const img = document.createElement("img");
            img.src = imagePath;
            img.alt = "Thumbnail";
            img.style.opacity = "0"; 
            
            img.onload = () => {
                img.style.opacity = "1"; 
            };

            const imgLink = document.createElement("a");
            imgLink.href = nd3Link;
            imgLink.target = "_blank";
            imgLink.appendChild(img);

            card.innerHTML = `
                <a href="${nd3Link}" target="_blank">
                  <div class="inner">
                    <p><strong>${meta.originalFileName}</strong></p>
                    <p>DATE: ${timestamp.humanReadable}</p>
                    <p>AKALL: ${meta.akallCommand}</p>
                  </div>
                </a>
            `;

            card.prepend(imgLink); 
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = "<p>Failed to load data.</p>";
    }
});
