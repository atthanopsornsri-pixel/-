"use client";
import { toast } from "sonner";
import Link from "next/link";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { Wind, RotateCw, LayoutGrid, UserPlus, BedDouble, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { QRCodeSVG } from "qrcode.react";

function SecureImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (!src) {
      setResolvedSrc("");
      return;
    }
    
    // If it's already a base64 Data URL or standard URL, use it directly
    if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
      setResolvedSrc(src);
      return;
    }

    // If it's a Supabase storage path, fetch a signed URL
    let active = true;
    async function fetchUrl() {
      try {
        const res = await fetch("/api/storage/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath: src })
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data.signedUrl) {
            setResolvedSrc(data.signedUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load signed image URL", err);
      }
    }

    fetchUrl();
    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) {
    return <div className={`bg-slate-100 animate-pulse ${className}`} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} alt={alt} className={className} />;
}

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyIdParam = searchParams.get("propertyId");

  const [propertyId, setPropertyId] = useState(propertyIdParam || "");
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rentPrice, setRentPrice] = useState("");

  // Specific image fields removed
  const [isUploading, setIsUploading] = useState(false);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editRentPrice, setEditRentPrice] = useState("");

  // Room Gallery image states
  const [editImageMain, setEditImageMain] = useState("");
  const [editImageBathroom, setEditImageBathroom] = useState("");
  const [editImageBalcony, setEditImageBalcony] = useState("");
  const [editImageFacility, setEditImageFacility] = useState("");
  const [uploadingImageSlot, setUploadingImageSlot] = useState<string | null>(null);
  const [activePreviews, setActivePreviews] = useState<Record<string, string>>({});

  // New MVP States
  const [editStatus, setEditStatus] = useState("AVAILABLE");
  const [editWaterMeter, setEditWaterMeter] = useState("");
  const [editElectricMeter, setEditElectricMeter] = useState("");
  const [editHasAircon, setEditHasAircon] = useState(false);
  const [editHasFan, setEditHasFan] = useState(false);
  const [editHasFurniture, setEditHasFurniture] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [printInviteRoom, setPrintInviteRoom] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string; property: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Vacancy post drafting states (No "AI" naming in UI)
  const [isDraftingListing, setIsDraftingListing] = useState(false);
  const [draftedListingText, setDraftedListingText] = useState<string | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftingRoomNumber, setDraftingRoomNumber] = useState("");

  // ── SWR: properties (cached, stale-while-revalidate) ──────────────
  const { data: properties = [], mutate: mutateProperties } = useSWR<any[]>(
    "/api/properties",
    jsonFetcher
  );

  // ── SWR: rooms (re-fetches when propertyId changes) ───────────────
  const roomsKey = propertyId
    ? `/api/rooms?propertyId=${propertyId}`
    : propertyIdParam
    ? `/api/rooms?propertyId=${propertyIdParam}`
    : "/api/rooms";

  const { data: rooms = [], isLoading, mutate: mutateRooms } = useSWR<any[]>(
    roomsKey,
    jsonFetcher
  );

  // Auto-select first property on initial load
  useEffect(() => {
    if (!propertyId && !propertyIdParam && properties.length > 0) {
      setPropertyId(properties[0].id);
    }
  }, [properties, propertyId, propertyIdParam]);

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPropertyId(e.target.value);
    // SWR will automatically re-fetch when roomsKey changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId, 
          number, 
          floor, 
          rentPrice: parseFloat(rentPrice)
        }),
      });

      if (res.ok) {
        setNumber("");
        setFloor("");
        setRentPrice("");

        mutateRooms();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData?.code === "LIMIT_REACHED") {
          toast.error(errData.message || "ถึงขีดจำกัดห้องของแพ็กเกจแล้ว กรุณาอัปเกรดแพ็กเกจ");
        } else {
          toast.error(errData?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`ลบห้อง ${deleteTarget.number} เรียบร้อยแล้ว`);
        setDeleteTarget(null);
        mutateRooms();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "ไม่สามารถลบห้องได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDraftVacancyListing = async (room: any) => {
    setIsDraftingListing(true);
    setDraftedListingText(null);
    setDraftingRoomNumber(room.number);
    setIsDraftModalOpen(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/draft-post`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setDraftedListingText(data.text);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "ไม่สามารถร่างข้อความโฆษณาได้ในขณะนี้");
        setIsDraftModalOpen(false);
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบหลังบ้าน");
      setIsDraftModalOpen(false);
    } finally {
      setIsDraftingListing(false);
    }
  };

  const handleCopyDraftText = () => {
    if (draftedListingText) {
      navigator.clipboard.writeText(draftedListingText);
      toast.success("คัดลอกข้อความโฆษณาเรียบร้อยแล้ว! 📋");
    }
  };

  const handleEditClick = (room: any) => {
    setEditingRoom(room);
    setEditNumber(room.number);
    setEditFloor(room.floor || "");
    setEditRentPrice(room.rentPrice.toString());
    setEditStatus(room.status || "AVAILABLE");
    setEditWaterMeter(room.waterMeterStart?.toString() || "");
    setEditElectricMeter(room.electricMeterStart?.toString() || "");
    setEditHasAircon(room.hasAircon || false);
    setEditHasFan(room.hasFan || false);
    setEditHasFurniture(room.hasFurniture || false);
    
    // Set edit image values
    setEditImageMain(room.imageMain || "");
    setEditImageBathroom(room.imageBathroom || "");
    setEditImageBalcony(room.imageBalcony || "");
    setEditImageFacility(room.imageFacility || "");
    setIsEditModalOpen(true);
  };

  const handleFileUpload = async (slot: string, file: File) => {
    setUploadingImageSlot(slot);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        const uploadData = await res.json();
        if (slot === "main") setEditImageMain(uploadData.url);
        else if (slot === "bathroom") setEditImageBathroom(uploadData.url);
        else if (slot === "balcony") setEditImageBalcony(uploadData.url);
        else if (slot === "facility") setEditImageFacility(uploadData.url);
        toast.success("อัปโหลดรูปภาพสำเร็จ!");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "อัปโหลดไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setUploadingImageSlot(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: editNumber,
          floor: editFloor,
          rentPrice: parseFloat(editRentPrice),
          status: editStatus,
          waterMeterStart: parseFloat(editWaterMeter) || 0,
          electricMeterStart: parseFloat(editElectricMeter) || 0,
          hasAircon: editHasAircon,
          hasFan: editHasFan,
          hasFurniture: editHasFurniture,
          imageMain: editImageMain,
          imageBathroom: editImageBathroom,
          imageBalcony: editImageBalcony,
          imageFacility: editImageFacility
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        mutateRooms();
      } else {
        toast.error("เกิดข้อผิดพลาดในการแก้ไข");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditing(false);
    }
  };

  // สีและป้ายตามสถานะห้อง — ใช้ทั้งแถบบนการ์ดและ badge ให้ดูออกทันที
  const statusMeta = (status: string) => {
    switch (status) {
      case "OCCUPIED":
        return {
          label: "มีผู้เช่า",
          bar: "#34508c",
          badge: "bg-[#e9eef7] text-[#34508c] border border-[#34508c]/20",
        };
      case "MAINTENANCE":
        return {
          label: "ปรับปรุง",
          bar: "#FF3B30",
          badge: "bg-red-50 text-red-600 border border-red-200",
        };
      default: // AVAILABLE
        return {
          label: "ห้องว่าง",
          bar: "#34C759",
          badge: "bg-[#E8F8F5] text-[#34C759] border border-[#34C759]/20",
        };
    }
  };

  const handleCopyInvite = async (roomId: string, code: string) => {
    try {
      const inviteLink = `${window.location.origin}/register/tenant?code=${code}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedRoomId(roomId);
      toast.success("คัดลอกลิงก์เชิญลูกบ้านสำเร็จแล้ว!");
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error("ไม่สามารถคัดลอกลิงก์ได้:", err);
      toast.error("เกิดข้อผิดพลาดในการคัดลอกลิงก์");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
            style={{ background: "#34c759", color: "#fff", boxShadow: "0 10px 22px -8px #34c759" }}
          >
            <BedDouble className="h-[22px] w-[22px]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[var(--jh-ink)] tracking-[-0.02em]">
            จัดการห้องพัก
          </h1>
        </div>

        {/* Select Property Filter */}
        <div className="w-full sm:w-auto bg-white rounded-full px-4 py-2 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-slate-100">
          <select 
            value={propertyId} 
            onChange={handlePropertyChange}
            className="bg-transparent font-medium text-slate-700 focus:outline-none w-full sm:w-64"
          >
            <option value="">เลือกหอพัก...</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Room Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 sticky top-28">
            <div className="w-12 h-12 bg-[#E8F8F5] text-[#10B981] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-6">เพิ่มห้องใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium ml-1">หอพัก/อพาร์ตเม้นท์</Label>
                <select 
                  value={propertyId} 
                  onChange={handlePropertyChange} 
                  required
                  className="w-full rounded-2xl h-12 bg-slate-50 border border-slate-200 focus:bg-white px-4 text-sm"
                >
                  <option value="" disabled>เลือกหอพัก</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium ml-1">หมายเลขห้อง</Label>
                  <Input 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)} 
                    required 
                    placeholder="เช่น 101"
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium ml-1">ชั้น</Label>
                  <Input 
                    value={floor} 
                    onChange={(e) => setFloor(e.target.value)} 
                    placeholder="เช่น 1"
                    className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-medium ml-1">ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                <Input 
                  type="number" 
                  value={rentPrice} 
                  onChange={(e) => setRentPrice(e.target.value)} 
                  required 
                  placeholder="เช่น 4500"
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white px-4"
                />
              </div>


              <Button 
                type="submit" 
                className="w-full rounded-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-md mt-6 transition-all hover:-translate-y-0.5" 
                disabled={isUploading}
              >
                {isUploading ? "กำลังบีบอัดและบันทึกรูปภาพ..." : "เพิ่มห้องพัก"}
              </Button>
            </form>
          </div>
        </div>

        {/* Room List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col animate-pulse">
                  <div className="h-3 w-full bg-slate-200"></div>
                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 w-2/3">
                        <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded-md w-1/2"></div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-md w-1/3 mt-2"></div>
                    <div className="mt-6 flex gap-3">
                      <div className="h-11 bg-slate-100 rounded-full flex-1"></div>
                      <div className="h-11 bg-slate-200 rounded-full flex-1"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีห้องพัก</h3>
              <p className="text-slate-500">เพิ่มห้องพักใหม่ที่ฟอร์มด้านซ้ายมือ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => {
              const meta = statusMeta(room.status);
              
              // Compile all valid image slots for the room
              const allImages = [
                { key: "main", url: room.imageMain, label: "ห้องนอน" },
                { key: "bathroom", url: room.imageBathroom, label: "ห้องน้ำ" },
                { key: "balcony", url: room.imageBalcony, label: "ระเบียง" },
                { key: "facility", url: room.imageFacility, label: "สิ่งอำนวยความสะดวก" }
              ].filter(img => img.url);

              const currentImage = activePreviews[room.id] || room.imageMain;

              return (
              <div key={room.id} className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
                {currentImage ? (
                  <div className="h-44 w-full bg-slate-200 relative overflow-hidden shrink-0">
                    <SecureImage src={currentImage} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                    <span className="absolute top-0 left-0 h-1.5 w-full" style={{ background: meta.bar }} />
                    
                    {/* Hover switch dots if multiple images exist */}
                    {allImages.length > 1 && (
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 justify-center bg-black/40 backdrop-blur-sm py-1.5 px-3 rounded-full transition-opacity duration-300 opacity-90 group-hover:opacity-100 z-10">
                        {allImages.map(img => (
                          <button
                            key={img.key}
                            type="button"
                            onMouseEnter={() => setActivePreviews(prev => ({ ...prev, [room.id]: img.url! }))}
                            onClick={() => setActivePreviews(prev => ({ ...prev, [room.id]: img.url! }))}
                            className={`w-2.5 h-2.5 rounded-full border border-white/60 transition-all ${
                              currentImage === img.url ? "bg-[#d4a548] scale-110 border-white" : "bg-white/60 hover:bg-white"
                            }`}
                            title={img.label}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-3 w-full" style={{ background: meta.bar }}></div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-extrabold text-2xl text-[#1D1D1F]">ห้อง {room.number}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{room.property.name} • ชั้น {room.floor || "-"}</p>
                      
                      {/* Amenities Icons/Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {room.hasAircon && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <Wind className="w-3.5 h-3.5" /> แอร์
                          </span>
                        )}
                        {room.hasFan && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                            <RotateCw className="w-3.5 h-3.5" /> พัดลม
                          </span>
                        )}
                        {room.hasFurniture && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            <LayoutGrid className="w-3.5 h-3.5" /> เฟอร์ฯ
                          </span>
                        )}
                        {!room.hasAircon && !room.hasFan && !room.hasFurniture && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 italic">
                            ไม่มีสิ่งอำนวยความสะดวกพิเศษ
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap ${meta.badge}`}>
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: meta.bar }} />
                      {meta.label}
                    </span>
                  </div>


                  {room.inviteCode && (
                    <div className="flex gap-2 mb-4">
                      <div 
                        onClick={() => handleCopyInvite(room.id, room.inviteCode)}
                        className={`flex-1 p-3 rounded-2xl border flex justify-between items-center transition-all duration-200 cursor-pointer select-none ${
                          copiedRoomId === room.id
                            ? "bg-green-50 border-green-300 text-green-700 shadow-sm scale-[0.98]"
                            : "bg-slate-50 border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 group-hover:bg-blue-50/50"
                        }`}
                        title="คลิกเพื่อคัดลอกลิงก์เชิญลูกบ้าน"
                      >
                        <span className="text-[11px] font-medium text-slate-500">รหัสเชิญผู้เช่า</span>
                        <span className={`font-mono text-xs font-bold bg-white px-2 py-0.5 rounded-lg border shadow-sm transition-all ${
                          copiedRoomId === room.id
                            ? "border-green-400 text-green-700 font-bold"
                            : "border-slate-200 text-[#34508c]"
                        }`}>
                          {copiedRoomId === room.id ? "📋 คัดลอกแล้ว!" : room.inviteCode}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 h-11 w-11 shrink-0 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintInviteRoom(room);
                        }}
                        title="พิมพ์ใบ QR Code สำหรับห้องพัก"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xl font-extrabold text-[#1D1D1F] my-2 mb-6">
                    ฿{room.rentPrice.toLocaleString()}<span className="text-sm font-medium text-slate-400">/เดือน</span>
                  </div>
                  
                  {room.status === "AVAILABLE" && (
                    <Button
                      variant="outline"
                      onClick={() => handleDraftVacancyListing(room)}
                      className="w-full mb-3 rounded-full border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100/80 h-10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_8px_18px_-6px_rgba(255,149,0,0.15)]"
                    >
                      เขียนคำโฆษณาปล่อยเช่า
                    </Button>
                  )}
                  
                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-red-100 text-red-300 hover:bg-red-50 hover:text-red-500 h-11 w-11 shrink-0 transition-colors"
                      onClick={() => setDeleteTarget({ id: room.id, number: room.number, property: room.property.name })}
                      title="ลบห้องพัก"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 h-11 font-semibold" onClick={() => handleEditClick(room)}>
                      แก้ไข
                    </Button>
                    {room.status === "AVAILABLE" && (
                      <Link href={`/dashboard/tenants?action=create&roomId=${room.id}&roomNumber=${room.number}`} className="flex-1">
                        <Button
                          className="w-full rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white h-11 font-semibold shadow-sm flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" /> รับผู้เช่า
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">แก้ไขห้องพัก</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>หมายเลขห้อง</Label>
                <Input value={editNumber} onChange={e => setEditNumber(e.target.value)} required className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>ชั้น (ไม่บังคับ)</Label>
                <Input value={editFloor} onChange={e => setEditFloor(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>ค่าเช่าพื้นฐาน (บาท/เดือน)</Label>
                <Input type="number" value={editRentPrice} onChange={e => setEditRentPrice(e.target.value)} required className="rounded-xl h-11" />
              </div>

              <div className="mt-6 space-y-4 border-t border-slate-100 py-4">
                <h3 className="text-md font-semibold text-slate-800">การจัดการสถานะและมิเตอร์ (MVP)</h3>
                
                {/* 1. เลือกสถานะห้อง */}
                <div className="space-y-2">
                  <Label>สถานะห้องพัก</Label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl h-11 bg-slate-50 border border-slate-200 focus:bg-white px-4 text-sm"
                  >
                    <option value="AVAILABLE">🟢 ว่าง (พร้อมปล่อยเช่า)</option>
                    <option value="OCCUPIED">🔵 มีผู้เช่า</option>
                    <option value="MAINTENANCE">🔴 ปรับปรุง / ซ่อมแซม</option>
                  </select>
                </div>

                {/* 2. มิเตอร์ตั้งต้น */}
                <div className="space-y-4 pt-2">
                  {/* ส่วนของมิเตอร์น้ำ */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      💧 เลขมิเตอร์น้ำตั้งต้น <span className="text-xs font-normal text-slate-400">(หน่วย)</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={editWaterMeter}
                        onChange={(e) => setEditWaterMeter(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 pr-16 focus:ring-blue-500 focus:border-blue-500 h-11"
                        placeholder="กรอกตัวเลขหน่วยปัจจุบันบนมิเตอร์ เช่น 0.0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-slate-400 font-medium">หน่วย</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">ค่าน้ำจะคำนวณจาก: (หน่วยเดือนนี้ - หน่วยตั้งต้น) × ราคาต่อหน่วย</p>
                  </div>

                  {/* ส่วนของมิเตอร์ไฟ */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      ⚡ เลขมิเตอร์ไฟตั้งต้น <span className="text-xs font-normal text-slate-400">(หน่วย)</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="1"
                        value={editElectricMeter}
                        onChange={(e) => setEditElectricMeter(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 pr-16 focus:ring-blue-500 focus:border-blue-500 h-11"
                        placeholder="กรอกตัวเลขหน่วยปัจจุบันบนมิเตอร์ เช่น 1250"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-slate-400 font-medium">หน่วย</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">ค่าไฟจะคำนวณจาก: (หน่วยเดือนนี้ - หน่วยตั้งต้น) × ราคาต่อหน่วย</p>
                  </div>
                </div>
                
                {/* 3. สิ่งอำนวยความสะดวก */}
                <div className="space-y-2 mt-4">
                  <Label>สิ่งอำนวยความสะดวก</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasAircon} onChange={(e) => setEditHasAircon(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      แอร์
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasFan} onChange={(e) => setEditHasFan(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      พัดลม
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={editHasFurniture} onChange={(e) => setEditHasFurniture(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      เฟอร์นิเจอร์
                    </label>
                  </div>
                </div>

                {/* 4. แกลเลอรีรูปภาพห้องพัก */}
                <div className="space-y-3 mt-6 border-t border-slate-100 pt-4">
                  <Label className="text-sm font-bold text-slate-800">แกลเลอรีรูปภาพห้องพัก (อัปโหลดเข้าเซิร์ฟเวอร์หลัก)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Main image */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">1. ภาพหลักห้องพัก</span>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-28 flex flex-col items-center justify-center">
                        {editImageMain ? (
                          <>
                            <SecureImage src={editImageMain} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImageMain("")}
                              className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs shadow-md z-20 flex items-center justify-center w-5 h-5 font-bold"
                              title="ลบรูป"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-100 transition-colors">
                            {uploadingImageSlot === "main" ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span className="text-lg">+</span>
                                <span className="text-[10px]">อัปโหลดรูป</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!!uploadingImageSlot}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("main", file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Bathroom image */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">2. ภาพห้องน้ำ</span>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-28 flex flex-col items-center justify-center">
                        {editImageBathroom ? (
                          <>
                            <SecureImage src={editImageBathroom} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImageBathroom("")}
                              className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs shadow-md z-20 flex items-center justify-center w-5 h-5 font-bold"
                              title="ลบรูป"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-100 transition-colors">
                            {uploadingImageSlot === "bathroom" ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span className="text-lg">+</span>
                                <span className="text-[10px]">อัปโหลดรูป</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!!uploadingImageSlot}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("bathroom", file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Balcony image */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">3. ภาพระเบียง / วิว</span>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-28 flex flex-col items-center justify-center">
                        {editImageBalcony ? (
                          <>
                            <SecureImage src={editImageBalcony} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImageBalcony("")}
                              className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs shadow-md z-20 flex items-center justify-center w-5 h-5 font-bold"
                              title="ลบรูป"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-100 transition-colors">
                            {uploadingImageSlot === "balcony" ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span className="text-lg">+</span>
                                <span className="text-[10px]">อัปโหลดรูป</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!!uploadingImageSlot}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("balcony", file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Facility image */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">4. ภาพสิ่งอำนวยความสะดวก</span>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-28 flex flex-col items-center justify-center">
                        {editImageFacility ? (
                          <>
                            <SecureImage src={editImageFacility} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditImageFacility("")}
                              className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs shadow-md z-20 flex items-center justify-center w-5 h-5 font-bold"
                              title="ลบรูป"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:bg-slate-100 transition-colors">
                            {uploadingImageSlot === "facility" ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span className="text-lg">+</span>
                                <span className="text-[10px]">อัปโหลดรูป</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!!uploadingImageSlot}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload("facility", file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  *หมายเหตุ: เลขมิเตอร์ตั้งต้นจะถูกใช้เป็นฐานในการคำนวณบิลค่าเช่าในเดือนแรกที่ลูกบ้านย้ายเข้า
                </p>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl h-11 font-semibold text-slate-600 hover:bg-slate-100">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isEditing} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm">
                  {isEditing ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Room Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`ลบห้อง ${deleteTarget?.number ?? ""}?`}
        subtitle={deleteTarget?.property}
        impacts={[
          "ข้อมูลห้องพักและการตั้งค่าทั้งหมด",
          "ประวัติบิลและการชำระเงินในห้องนี้",
          "รหัสเชิญ (Invite Code) ของห้อง",
        ]}
        isDeleting={isDeleting}
      />

      {/* Draft Vacancy Listing Modal (Excluding any 'AI' words) */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-800">ร่างประกาศเช่าห้อง {draftingRoomNumber}</h2>
              <button onClick={() => setIsDraftModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {isDraftingListing ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-slate-500">ระบบกำลังร่างข้อความโฆษณาปล่อยเช่า...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    ข้อความโฆษณาปล่อยเช่าที่เรียบเรียงขึ้นตามรายละเอียดของห้องและทำเลหอพัก สามารถคัดลอกไปใช้โพสต์ได้ทันที:
                  </p>
                  <textarea
                    readOnly
                    value={draftedListingText || ""}
                    className="w-full h-64 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-base font-medium leading-loose font-sarabun focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsDraftModalOpen(false)}
                      className="rounded-xl h-11 font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      ปิด
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCopyDraftText}
                      className="rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 shadow-[0_8px_18px_-6px_#d4a548] flex items-center gap-2"
                    >
                      📋 คัดลอกข้อความ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print QR Code Modal */}
      {printInviteRoom && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setPrintInviteRoom(null)}
        >
          <div 
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col print:p-0 print:shadow-none print:border-none print:fixed print:inset-0 print:bg-white print:z-[9999] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden shrink-0">
              <h3 className="font-bold text-[#1D1D1F]">ใบลงทะเบียน QR Code</h3>
              <button onClick={() => setPrintInviteRoom(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* The Card to Print */}
            <div className="p-8 flex-1 overflow-auto flex flex-col items-center text-center bg-white print:p-12 print:justify-center">
              {/* Mascot / Brand header */}
              <div className="flex items-center gap-3 mb-6">
                <img src="/images/logo-mascot.png" alt="JadHor OS Logo" className="h-10 w-auto" />
                <div className="text-left">
                  <h4 className="font-black text-lg text-[#16264c]">JadHor OS</h4>
                  <p className="text-[10px] uppercase font-bold tracking-[0.05em] text-[#d4a548]">Smart Onboarding</p>
                </div>
              </div>

              <div 
                className="w-full border-2 border-dashed border-[#d4a548]/40 rounded-[24px] p-6 mb-6 flex flex-col items-center"
                style={{ background: "linear-gradient(150deg, #fdf8ee 0%, #f6ecd6 100%)" }}
              >
                <span className="text-xs uppercase font-extrabold tracking-[0.08em] text-[#d4a548] mb-1">ใบลงทะเบียนเข้าพัก</span>
                <h2 className="text-2xl font-black text-[#16264c] mb-4">ห้อง {printInviteRoom.number}</h2>
                
                {/* QR Code Container */}
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 mb-4">
                  <QRCodeSVG 
                    value={`${window.location.origin}/register/tenant?code=${printInviteRoom.inviteCode}`}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <p className="text-[11px] text-[var(--jh-orange-ink)] max-w-[260px] leading-relaxed mb-4">
                  สแกนเพื่อลงทะเบียนเข้าอยู่ สัญญาเช่า และเชื่อมต่อระบบแจ้งเตือนทาง LINE ของหอพัก {printInviteRoom.property?.name}
                </p>

                <div className="bg-white/80 border border-white/60 rounded-xl px-4 py-2 text-center shadow-sm w-full">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.05em]">รหัสเชิญห้องพัก (Invite Code)</span>
                  <div className="font-mono text-lg font-black text-[#16264c] mt-0.5 tracking-wider">{printInviteRoom.inviteCode}</div>
                </div>
              </div>

              <div className="text-left text-xs text-slate-500 space-y-2.5 max-w-[280px] print:text-slate-600">
                <div className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#16264c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>สแกน QR Code ด้านบนเพื่อลงทะเบียนผู้เช่า</span>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#16264c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>ตรวจสอบและกดยอมรับสัญญาเช่า e-Contract</span>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#16264c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span>ผูก LINE เพื่อรับบิล แจ้งเตือน และส่งสลิปได้ทันที!</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 print:hidden shrink-0">
              <Button variant="outline" className="flex-1 rounded-full border-slate-200 h-12" onClick={() => setPrintInviteRoom(null)}>
                ปิด
              </Button>
              <Button 
                className="flex-1 rounded-full bg-[#16264c] hover:bg-[#34508c] text-white font-bold h-12 shadow-sm flex items-center justify-center gap-1.5" 
                onClick={() => window.print()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                พิมพ์เอกสาร
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
