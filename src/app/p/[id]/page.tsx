import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const property = await prisma.property.findFirst({
    where: { id: resolvedParams.id, isDeleted: false },
  });
  
  if (!property) return { title: "ไม่พบข้อมูลหอพัก" };
  
  return {
    title: `${property.name} | จองห้องพัก`,
    description: `ข้อมูลห้องว่างและสิ่งอำนวยความสะดวกของ ${property.name} - ${property.address}`,
  };
}

export default async function PropertyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const propertyId = resolvedParams.id;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
    include: {
      owner: { select: { name: true, email: true } },
      rooms: {
        where: { status: "AVAILABLE", isDeleted: false },
        orderBy: { rentPrice: "asc" },
      }
    }
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Property Header / Hero */}
      <div className="bg-slate-900 text-white pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 opacity-90 z-0"></div>
        {property.imageUrl && (
          <img src={property.imageUrl} alt={property.name} className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay z-0" />
        )}
        
        <div className="container mx-auto px-4 max-w-5xl relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{property.name}</h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {property.address}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-12 relative z-20 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Main Content (Available Rooms) */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                ห้องว่างพร้อมเข้าอยู่ ({property.rooms.length})
              </h2>
              
              {property.rooms.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {property.rooms.map(room => (
                    <div key={room.id} className="border border-slate-100 bg-slate-50 rounded-2xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-slate-800">ห้อง {room.number}</h3>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">ว่าง</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">ชั้น:</span>
                          <span className="font-medium text-slate-700">{room.floor || "-"}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200">
                        <div className="text-sm text-slate-500 mb-1">ค่าเช่าเริ่มต้น</div>
                        <div className="text-2xl font-bold text-blue-600">฿{room.rentPrice.toLocaleString()} <span className="text-sm font-normal text-slate-500">/ เดือน</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-16 h-16 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </div>
                  <p className="text-slate-500">ขณะนี้ไม่มีห้องว่าง โปรดติดต่อสอบถามคิวล่วงหน้า</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Booking Form / Contact) */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-200 sticky top-24">
              <h3 className="text-xl font-bold text-slate-800 mb-2">สนใจจองห้องพัก</h3>
              <p className="text-sm text-slate-500 mb-6">กรอกข้อมูลเพื่อให้เจ้าหน้าที่ติดต่อกลับ หรือติดต่อโดยตรงได้ที่เบอร์ด้านล่าง</p>
              
              <form action="/api/inquiry" method="POST" className="space-y-4">
                <input type="hidden" name="propertyId" value={property.id} />
                
                <div className="space-y-2">
                  <Label>ชื่อผู้ติดต่อ</Label>
                  <Input name="name" required placeholder="ชื่อ-นามสกุล" />
                </div>
                
                <div className="space-y-2">
                  <Label>เบอร์โทรศัพท์</Label>
                  <Input name="phone" required placeholder="081-xxx-xxxx" />
                </div>
                
                <div className="space-y-2">
                  <Label>สอบถามห้อง / วันที่อยากเข้าพัก</Label>
                  <textarea 
                    name="message"
                    required
                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[80px] resize-none"
                    placeholder="เช่น สนใจห้อง 101 เข้าอยู่ต้นเดือนหน้า..."
                  ></textarea>
                </div>
                
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-2">
                  ส่งข้อความติดต่อ
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-3">ช่องทางติดต่ออื่นๆ</h4>
                <div className="flex items-center text-sm text-slate-600 mb-2">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {property.owner?.email}
                </div>
                {/* Note: Can add property phone number field in DB later */}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Footer Branding */}
      <footer className="py-8 text-center border-t border-slate-200 bg-white">
        <p className="text-sm text-slate-400">
          Powered by <span className="font-bold text-slate-600">JadHor OS</span>
        </p>
      </footer>
    </div>
  );
}
