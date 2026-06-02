export async function sendLineNotify(token: string, message: string) {
  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });
    
    if (!res.ok) {
      console.error("Failed to send LINE notification:", await res.text());
    }
  } catch (error) {
    console.error("Error in sendLineNotify:", error);
  }
}
