import SessionService from "./api/SessionService";

// // Option A: Using .then()
// SessionService.getList()
//   .then((data) => console.log("✅ Sessions:", data))
//   .catch((err) => console.error("❌ Error:", err.message));

// Option B: Using an async wrapper (Cleaner)
const test = async () => {
  const data = await SessionService.getList();
  const specificSession = await SessionService.get(1); // Replace with actual session ID
    console.log(specificSession);
};

test();
