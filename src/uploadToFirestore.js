import { db } from "./firebase.js";
import { collection, doc, setDoc } from "firebase/firestore";
import data from "./data.json" assert { type: "json" };

async function uploadDataToFirestore() {
  try {
    const regionsCollection = collection(db, "regions");
    for (const region of data.regions) {
      await setDoc(doc(regionsCollection, region.region), {
        region: region.region,
        yearlyData: region.yearlyData,
      });
      console.log(`Uploaded data for ${region.region}`);
    }
    console.log("All data uploaded successfully!");
  } catch (error) {
    console.error("Error uploading data:", error);
  }
}

uploadDataToFirestore();
