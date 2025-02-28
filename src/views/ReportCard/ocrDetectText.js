import Tesseract from "tesseract.js";

export async function detectTextPositions(imageUrl) {
  console.log("🔄 Running OCR on image...");

  const { data } = await Tesseract.recognize(imageUrl, "eng", {
    logger: (m) => console.log("📝 OCR Progress:", m),
  });

  console.log("✅ Full OCR Data:", data); // Log everything

  if (!data || !data.text) {
    console.error("❌ OCR failed: No text detected.");
    return []; // Return empty array instead of throwing an error
  }

  console.log("📌 Extracted Text:", data.text);

  // Manually split text into lines (since data.lines is missing)
  const textLines = data.text.split("\n").filter((line) => line.trim().length > 0);

  console.log("📄 Detected Lines:", textLines);

  // Simulated positioning (since Tesseract didn’t return bbox data)
  return textLines.map((line, index) => ({
    text: line,
    x: 100, // Default X position
    y: 800 - index * 30, // Spacing out lines top-down
    width: 200,
    height: 20,
  }));
}
