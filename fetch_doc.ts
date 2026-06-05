import fs from "fs";

async function run() {
  try {
    const url = "https://docs.google.com/document/d/1Q396bGnmJ84f-duN7KHdoGlL4aTUkAemM1GDT71ucgA/export?format=txt";
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync("./doc_text.txt", text, "utf-8");
    console.log("Successfully wrote doc to doc_text.txt, length:", text.length);
  } catch (err) {
    console.error("Error fetching doc:", err);
  }
}

run();
