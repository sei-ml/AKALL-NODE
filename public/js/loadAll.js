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
            
            const card = document.createElement("div");
            card.classList.add("card");
            card.innerHTML = `
                <a href="/?nd3=${meta.processedPath.split("/")[6]}" target="_blank">
                <img src="${imagePath}" alt="Thumbnail">
                <div class="inner">
                <p><strong>${meta.originalFileName}</strong></p>
                <p>D: ${timestamp.humanReadable}</p>
                <p>C: ${meta.akallCommand}</p></a>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = "<p>Failed to load data.</p>";
    }
});
