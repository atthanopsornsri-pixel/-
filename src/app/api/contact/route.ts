import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    // In a real app, you would save this to the DB or send an email.
    // For now, we just redirect back to the home page with a success message.
    
    // Read data just to show we can
    const name = formData.get("name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const message = formData.get("message");
    
    console.log(`New Contact Inquiry: ${name} (${phone}, ${email}) - ${message}`);

    // Redirect back to home page with a hash or query param (simulated success)
    return NextResponse.redirect(new URL("/?contact=success#contact", req.url), { status: 303 });
  } catch (error) {
    return NextResponse.redirect(new URL("/?contact=error#contact", req.url), { status: 303 });
  }
}
