import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Image Migration: imageUrls → Media + TourMedia/SpotMedia ===\n");

  // Collect unique URLs from tours
  const tours = await prisma.tour.findMany({ select: { id: true, title: true, imageUrls: true } });
  const spots = await prisma.spot.findMany({ select: { id: true, name: true, imageUrls: true } });

  const urlToMediaId = new Map<string, string>();
  let mediaCreated = 0;
  let tourLinksCreated = 0;
  let spotLinksCreated = 0;

  // Process tours
  for (const tour of tours) {
    const urls: string[] = JSON.parse(tour.imageUrls);
    if (urls.length === 0) continue;

    console.log(`Tour: ${tour.title} (${urls.length} images)`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      let mediaId = urlToMediaId.get(url);

      if (!mediaId) {
        // Create Media record for this URL
        const filename = extractFilename(url);
        // For Unsplash URLs, append size param for thumbnail
        const thumbnailUrl = url.includes("unsplash.com")
          ? `${url}${url.includes("?") ? "&" : "?"}w=400&h=300&fit=crop`
          : url;

        const media = await prisma.media.create({
          data: {
            filename,
            originalUrl: url,
            thumbnailUrl,
            mimeType: "image/jpeg",
            sizeBytes: 0,
            width: null,
            height: null,
            alt: "",
          },
        });
        mediaId = media.id;
        urlToMediaId.set(url, mediaId);
        mediaCreated++;
      }

      // Link to tour
      await prisma.tourMedia.upsert({
        where: { tourId_mediaId: { tourId: tour.id, mediaId } },
        update: { sortOrder: i },
        create: { tourId: tour.id, mediaId, sortOrder: i },
      });
      tourLinksCreated++;
    }
  }

  // Process spots
  for (const spot of spots) {
    const urls: string[] = JSON.parse(spot.imageUrls);
    if (urls.length === 0) continue;

    console.log(`Spot: ${spot.name} (${urls.length} images)`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      let mediaId = urlToMediaId.get(url);

      if (!mediaId) {
        const filename = extractFilename(url);
        const thumbnailUrl = url.includes("unsplash.com")
          ? `${url}${url.includes("?") ? "&" : "?"}w=400&h=300&fit=crop`
          : url;

        const media = await prisma.media.create({
          data: {
            filename,
            originalUrl: url,
            thumbnailUrl,
            mimeType: "image/jpeg",
            sizeBytes: 0,
            alt: "",
          },
        });
        mediaId = media.id;
        urlToMediaId.set(url, mediaId);
        mediaCreated++;
      }

      await prisma.spotMedia.upsert({
        where: { spotId_mediaId: { spotId: spot.id, mediaId } },
        update: { sortOrder: i },
        create: { spotId: spot.id, mediaId, sortOrder: i },
      });
      spotLinksCreated++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Media records created: ${mediaCreated}`);
  console.log(`Tour-Media links created: ${tourLinksCreated}`);
  console.log(`Spot-Media links created: ${spotLinksCreated}`);
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "unknown.jpg";
  } catch {
    return "unknown.jpg";
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
