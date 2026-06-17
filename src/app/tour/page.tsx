"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Home, 
  User, 
  Zap, 
  Droplet, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle, 
  PenTool, 
  Plus, 
  MessageSquare, 
  FileText, 
  Settings, 
  Sparkles,
  ClipboardList
} from "lucide-react";

// Mock types
interface MockRoom {
  number: string;
  rent: number;
  floor: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  hasAircon: boolean;
  hasFan: boolean;
  hasFurniture: boolean;
  waterMeterStart: number;
  electricMeterStart: number;
  tenantName?: string;
  tenantPhone?: string;
  contractSigned?: boolean;
}

export default function InteractiveTourPage() {
  const [tourStep, setTourStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeTab, setActiveTab] = useState<"owner" | "tenant">("owner");
  
  // Interactive Simulation State
  const [rooms, setRooms] = useState<MockRoom[]>([
    { number: "201", rent: 4500, floor: "2", status: "AVAILABLE", hasAircon: false, hasFan: true, hasFurniture: true, waterMeterStart: 120, electricMeterStart: 450 },
    { number: "202", rent: 5500, floor: "2", status: "AVAILABLE", hasAircon: true, hasFan: true, hasFurniture: true, waterMeterStart: 80, electricMeterStart: 310 },
  ]);
  
  const [newRoomNo, setNewRoomNo] = useState("101");
  const [newRoomRent, setNewRoomRent] = useState(5000);
  const [newRoomFloor, setNewRoomFloor] = useState("1");
  const [newRoomAircon, setNewRoomAircon] = useState(true);
  
  const [tenantName, setTenantName] = useState("สมชาย ดีใจดี");
  const [tenantPhone, setTenantPhone] = useState("089-123-4567");
  const [tenantIdCard, setTenantIdCard] = useState("1-2345-67890-12-3");
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [waterRead, setWaterRead] = useState("128"); // 8 units
  const [electricRead, setElectricRead] = useState("610"); // 160 units (high! triggers anomaly)
  const [invoice, setInvoice] = useState<{
    waterUnits: number;
    electricUnits: number;
    waterAmount: number;
    electricAmount: number;
    total: number;
    isPaid: boolean;
    anomalyAlert: string | null;
  } | null>(null);

  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [slipVerified, setSlipVerified] = useState(false);

  // Auto transition tab helper
  useEffect(() => {
    if (tourStep === 1 || tourStep === 2) {
      setActiveTab("owner");
    } else if (tourStep === 4) {
      setActiveTab("tenant");
    }
  }, [tourStep]);

  // Actions
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNo) return;
    const exists = rooms.some(r => r.number === newRoomNo);
    if (exists) return;

    const newR: MockRoom = {
      number: newRoomNo,
      rent: Number(newRoomRent),
      floor: newRoomFloor,
      status: "AVAILABLE",
      hasAircon: newRoomAircon,
      hasFan: true,
      hasFurniture: true,
      waterMeterStart: 100,
      electricMeterStart: 250
    };
    setRooms([...rooms, newR]);
    setTourStep(2);
  };

  const handleSimulateTenant = () => {
    setRooms(rooms.map((r, i) => {
      // Add tenant to the room that was created (or the first available)
      if (r.number === newRoomNo || (i === 0 && r.status === "AVAILABLE")) {
        return {
          ...r,
          status: "OCCUPIED",
          tenantName,
          tenantPhone,
          contractSigned: false
        };
      }
      return r;
    }));
  };

  const handleSignContract = () => {
    setIsSigning(true);
    setTimeout(() => {
      setSignatureData("สมชาย ดีใจดี (ลายเซ็นอิเล็กทรอนิกส์)");
      setRooms(rooms.map(r => {
        if (r.tenantName === tenantName) {
          return { ...r, contractSigned: true };
        }
        return r;
      }));
      setIsSigning(false);
      setTourStep(3);
    }, 1200);
  };

  const handleCalculateBill = () => {
    const targetRoom = rooms.find(r => r.tenantName === tenantName) || rooms[0];
    const wUnits = Number(waterRead) - targetRoom.waterMeterStart;
    const eUnits = Number(electricRead) - targetRoom.electricMeterStart;
    
    const wAmount = wUnits * 18; // 18 THB per unit
    const eAmount = eUnits * 8;  // 8 THB per unit
    const totalSum = targetRoom.rent + wAmount + eAmount;

    // Check anomaly (e.g. electric units > 100 is anomaly for demo)
    let anomaly: string | null = null;
    if (eUnits > 120) {
      anomaly = `แจ้งเตือน: ค่าไฟฟ้าห้อง ${targetRoom.number} สูงกว่าค่าเฉลี่ยย้อนหลัง 50% (ปริมาณการใช้ ${eUnits} หน่วย) โปรดตรวจเช็คความปลอดภัยของอุปกรณ์ไฟฟ้า`;
    }

    setInvoice({
      waterUnits: wUnits,
      electricUnits: eUnits,
      waterAmount: wAmount,
      electricAmount: eAmount,
      total: totalSum,
      isPaid: false,
      anomalyAlert: anomaly
    });

    setTourStep(4);
  };

  const handleVerifySlip = () => {
    setIsVerifyingSlip(true);
    setTimeout(() => {
      setSlipVerified(true);
      if (invoice) {
        setInvoice({ ...invoice, isPaid: true });
      }
      setIsVerifyingSlip(false);
    }, 1500);
  };

  const handleReset = () => {
    setTourStep(1);
    setRooms([
      { number: "201", rent: 4500, floor: "2", status: "AVAILABLE", hasAircon: false, hasFan: true, hasFurniture: true, waterMeterStart: 120, electricMeterStart: 450 },
      { number: "202", rent: 5500, floor: "2", status: "AVAILABLE", hasAircon: true, hasFan: true, hasFurniture: true, waterMeterStart: 80, electricMeterStart: 310 },
    ]);
    setNewRoomNo("101");
    setSignatureData(null);
    setInvoice(null);
    setSlipVerified(false);
    setActiveTab("owner");
  };

  // Find active room under simulation
  const simulatedRoom = rooms.find(r => r.tenantName === tenantName) || rooms[0];

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#1d1d1f] font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 bg-[#16264c] text-white border-b border-white/10 z-50 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#d4a548] flex items-center justify-center font-bold text-white shadow-[0_4px_12px_rgba(212,165,72,0.3)]">
              JH
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">JadHor OS</h1>
              <p className="text-xs text-blue-200/80 font-medium">ระบบจำลองการทำงานจริง (Interactive Tour)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition font-medium"
            >
              เริ่มต้นใหม่
            </button>
            <Link 
              href="/" 
              className="text-xs px-3 py-1.5 rounded-lg bg-[#d4a548] text-white font-semibold shadow-[0_4px_10px_rgba(212,165,72,0.3)] hover:opacity-90 transition"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Steps Control Panel (5 cols) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-[#d9d3c5] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#16264c] mb-1">แผงควบคุมระบบจำลอง</h2>
            <p className="text-xs text-gray-500 mb-6">คลิกดำเนินขั้นตอนการเช็คอินและออกบิลตามลำดับเพื่อดูผลลัพธ์การตอบสนองเชิงระบบ</p>

            {/* Stepper Vertical */}
            <div className="space-y-6 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-100">
              
              {/* STEP 1 */}
              <div className={`relative pl-12 transition-opacity duration-300 ${tourStep !== 1 ? "opacity-60" : "opacity-100"}`}>
                <div className={`absolute left-2.5 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  tourStep > 1 ? "bg-green-500 text-white" : tourStep === 1 ? "bg-[#16264c] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {tourStep > 1 ? "✓" : "1"}
                </div>
                
                <h3 className="font-bold text-sm text-[#16264c]">ขั้นตอนที่ 1: ลงทะเบียนจัดเตรียมห้องพัก</h3>
                <p className="text-xs text-gray-500 mt-0.5">จำลองฟังก์ชันฝั่งเจ้าของหอพักในการสร้างห้องเช่าใหม่เข้าระบบ</p>

                {tourStep === 1 && (
                  <form onSubmit={handleAddRoom} className="mt-4 p-4 rounded-2xl bg-[#f3f5fa] border border-[#c9d4ea] space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">หมายเลขห้อง</label>
                        <input 
                          type="text" 
                          value={newRoomNo} 
                          onChange={(e) => setNewRoomNo(e.target.value)}
                          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#16264c]" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">ค่าเช่ารายเดือน (บาท)</label>
                        <input 
                          type="number" 
                          value={newRoomRent} 
                          onChange={(e) => setNewRoomRent(Number(e.target.value))}
                          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#16264c]" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <input 
                          type="checkbox" 
                          checked={newRoomAircon} 
                          onChange={(e) => setNewRoomAircon(e.target.checked)}
                          className="rounded border-gray-300 text-[#16264c] focus:ring-[#16264c]"
                        />
                        ห้องปรับอากาศ (แอร์)
                      </label>
                      <button 
                        type="submit"
                        className="text-xs px-4 py-2 rounded-xl bg-[#16264c] text-white font-bold hover:bg-[#22345c] transition flex items-center gap-1 shadow-sm"
                      >
                        <Plus size={14} /> บันทึกห้องพัก
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* STEP 2 */}
              <div className={`relative pl-12 transition-opacity duration-300 ${tourStep !== 2 ? "opacity-60" : "opacity-100"}`}>
                <div className={`absolute left-2.5 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  tourStep > 2 ? "bg-green-500 text-white" : tourStep === 2 ? "bg-[#16264c] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {tourStep > 2 ? "✓" : "2"}
                </div>
                
                <h3 className="font-bold text-sm text-[#16264c]">ขั้นตอนที่ 2: ทำสัญญาและรับผู้เช่าเข้าพัก</h3>
                <p className="text-xs text-gray-500 mt-0.5">จำลองผู้เช่าลงทะเบียน ยืนยันสัญญารูปแบบลายเซ็นดิจิทัล</p>

                {tourStep === 2 && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#fdf8ee] border border-[#f0ddb0] space-y-3">
                    {!simulatedRoom.tenantName ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">ชื่อ-สกุล ผู้เช่า</label>
                            <input 
                              type="text" 
                              value={tenantName} 
                              onChange={(e) => setTenantName(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">เบอร์โทรศัพท์</label>
                            <input 
                              type="text" 
                              value={tenantPhone} 
                              onChange={(e) => setTenantPhone(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white" 
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleSimulateTenant}
                          className="w-full text-xs py-2 rounded-xl bg-[#d4a548] text-white font-bold hover:bg-[#b98a33] transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <User size={14} /> จำลองลูกบ้านลงทะเบียน
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-white/60 rounded-xl border border-[#efeae0] text-xs">
                          <p className="font-semibold text-gray-700">ผู้สมัครห้อง {simulatedRoom.number}:</p>
                          <p className="text-gray-600 mt-0.5">{simulatedRoom.tenantName} ({simulatedRoom.tenantPhone})</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-[#efeae0] text-center">
                          <p className="text-[10px] font-bold text-[#936b23] mb-2 uppercase tracking-wide">คลิกเพื่อลงลายมือชื่อ E-Signature ของลูกบ้าน</p>
                          <button 
                            onClick={handleSignContract}
                            disabled={isSigning}
                            className="w-full h-16 rounded-lg border-2 border-dashed border-[#d4a548] hover:bg-orange-50/50 flex items-center justify-center text-xs text-gray-400 gap-1.5 transition"
                          >
                            <PenTool size={16} className="text-[#d4a548]" />
                            {isSigning ? "กำลังลงนาม..." : "กดลงลายมือชื่อเซ็นสัญญาออนไลน์"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 3 */}
              <div className={`relative pl-12 transition-opacity duration-300 ${tourStep !== 3 ? "opacity-60" : "opacity-100"}`}>
                <div className={`absolute left-2.5 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  tourStep > 3 ? "bg-green-500 text-white" : tourStep === 3 ? "bg-[#16264c] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {tourStep > 3 ? "✓" : "3"}
                </div>
                
                <h3 className="font-bold text-sm text-[#16264c]">ขั้นตอนที่ 3: บันทึกหน่วยน้ำไฟ & ตรวจวัดรั่วไหล</h3>
                <p className="text-xs text-gray-500 mt-0.5">จำลองการป้อนมิเตอร์ และระบบวิเคราะห์ความผิดปกติ</p>

                {tourStep === 3 && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#f3fcf6] border border-[#e0f7e9] space-y-3">
                    <div className="p-3 bg-white/70 rounded-xl border border-white/60 text-xs text-gray-600">
                      <p className="font-semibold text-gray-700">ฐานข้อมูลประวัติเริ่มต้นห้อง {simulatedRoom.number}:</p>
                      <p className="mt-0.5">เลขมิเตอร์น้ำตั้งต้น: {simulatedRoom.waterMeterStart} หน่วย</p>
                      <p>เลขมิเตอร์ไฟตั้งต้น: {simulatedRoom.electricMeterStart} หน่วย</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">เลขจดมิเตอร์น้ำใหม่</label>
                        <input 
                          type="number" 
                          value={waterRead} 
                          onChange={(e) => setWaterRead(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">เลขจดมิเตอร์ไฟใหม่</label>
                        <input 
                          type="number" 
                          value={electricRead} 
                          onChange={(e) => setElectricRead(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white" 
                        />
                        <span className="text-[9px] text-orange-600 block mt-0.5">* ตั้งค่า &gt; 570 เพื่อดูแจ้งเตือนมิเตอร์สูงผิดปกติ</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleCalculateBill}
                      className="w-full text-xs py-2 rounded-xl bg-[#34c759] text-white font-bold hover:bg-[#1f9d4d] transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Zap size={14} /> ตรวจสอบความถูกต้องและสร้างบิล
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 4 */}
              <div className={`relative pl-12 transition-opacity duration-300 ${tourStep !== 4 ? "opacity-60" : "opacity-100"}`}>
                <div className={`absolute left-2.5 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  tourStep === 4 ? "bg-[#16264c] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  4
                </div>
                
                <h3 className="font-bold text-sm text-[#16264c]">ขั้นตอนที่ 4: ชำระบิล & ตรวจสอบสลิปผ่าน API</h3>
                <p className="text-xs text-gray-500 mt-0.5">จำลองลูกบ้านโอนเงิน และระบบสแกนสลิปโอนเงินอัจฉริยะ</p>

                {tourStep === 4 && invoice && (
                  <div className="mt-4 p-4 rounded-2xl bg-red-50/50 border border-red-200/60 space-y-3">
                    <div className="p-3 bg-white/70 rounded-xl border border-white/60 text-xs space-y-1 text-gray-700">
                      <p className="font-bold text-[#16264c] border-b pb-1 mb-1.5">สรุปยอดหนี้บิลห้อง {simulatedRoom.number}</p>
                      <div className="flex justify-between">
                        <span>ค่าเช่าห้อง:</span>
                        <span className="font-semibold">฿{simulatedRoom.rent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าน้ำ ({invoice.waterUnits} หน่วย):</span>
                        <span className="font-semibold">฿{invoice.waterAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าไฟ ({invoice.electricUnits} หน่วย):</span>
                        <span className="font-semibold">฿{invoice.electricAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-bold text-base text-red-600 mt-1">
                        <span>ยอดชำระรวม:</span>
                        <span>฿{invoice.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {!slipVerified ? (
                      <button 
                        onClick={handleVerifySlip}
                        disabled={isVerifyingSlip}
                        className="w-full text-xs py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck size={14} /> 
                        {isVerifyingSlip ? "กำลังประมวลผลวิเคราะห์สลิป..." : "แนบสลิปและสแกนตรวจสอบสลิปโอนเงิน"}
                      </button>
                    ) : (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold text-center flex items-center justify-center gap-1.5">
                        <CheckCircle size={16} /> สแกนสลิปสำเร็จ! ยอดเงินและวันเวลาถูกต้อง บันทึกบิลเป็นชำระเงินแล้ว
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* Right Side: Virtualizer Screen Visualizer (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          
          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1.5 bg-[#efeae0] rounded-2xl w-fit border border-[#d9d3c5]">
            <button 
              onClick={() => setActiveTab("owner")}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "owner" 
                  ? "bg-[#16264c] text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <ClipboardList size={14} />
              มุมมองเจ้าของหอพัก (Desktop UI)
            </button>
            <button 
              onClick={() => setActiveTab("tenant")}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "tenant" 
                  ? "bg-[#16264c] text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <MessageSquare size={14} />
              มุมมองลูกบ้าน (Mobile LINE)
            </button>
          </div>

          {/* Device Screen Frame */}
          <div className="bg-white rounded-3xl border border-[#d9d3c5] p-5 shadow-sm min-h-[500px] flex flex-col">
            
            {/* View 1: Owner Desktop UI */}
            {activeTab === "owner" && (
              <div className="flex-1 flex flex-col">
                {/* Header Mock */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">แผงควบคุมหลัก • สรุปสถานะตึก</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                    <span>ตึกจำลองอพาร์ตเมนต์ A</span>
                  </div>
                </div>

                {/* Main Content Area based on tour step */}
                <div className="flex-1 space-y-5">
                  {/* Step 1 & 2 representation: Room Grid */}
                  {(tourStep === 1 || tourStep === 2) && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[#16264c]">ตารางสถานะห้องพักในระบบ</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">ตารางห้องพัก</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {rooms.map(r => (
                          <div 
                            key={r.number}
                            className={`rounded-2xl border p-4 transition-all duration-300 relative group ${
                              r.status === "OCCUPIED" 
                                ? "bg-[#fdf8ee] border-[#f0ddb0]" 
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-lg font-bold text-[#16264c]">ห้อง {r.number}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                r.status === "OCCUPIED" ? "bg-amber-500" : "bg-green-500"
                              }`}></span>
                            </div>
                            <div className="mt-3 space-y-1 text-[10px] text-gray-500">
                              <p className="font-semibold text-gray-700">ค่าเช่า: ฿{r.rent.toLocaleString()}/ด.</p>
                              <p>ชั้น: {r.floor}</p>
                              <p className="truncate">
                                ผู้เช่า: {r.tenantName ? r.tenantName : <span className="text-gray-400 italic">ไม่มีผู้เช่า</span>}
                              </p>
                              {r.tenantName && (
                                <p className="text-[9px] font-semibold text-orange-700">
                                  สัญญา: {r.contractSigned ? "ลงนามแล้ว" : "รอลูกบ้านลงนาม"}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2 contract visualizer if client signature is active */}
                  {tourStep === 2 && simulatedRoom.tenantName && (
                    <div className="border border-[#d9d3c5] rounded-2xl p-4 bg-gray-50/60 max-w-md mx-auto">
                      <div className="flex items-center gap-1.5 border-b pb-2 mb-2 text-[#16264c]">
                        <FileText size={14} />
                        <span className="text-xs font-bold">เอกสารสัญญาเช่า (จำลอง)</span>
                      </div>
                      <div className="space-y-2 text-[10px] text-gray-600 leading-relaxed max-h-48 overflow-y-auto pr-1">
                        <p className="font-bold text-center text-xs text-gray-800 mb-2">สัญญาเช่าอาคารห้องพัก</p>
                        <p>คู่สัญญาตกลงทำสัญญากันโดยมีรายละเอียดดังนี้:</p>
                        <p><strong>ผู้เช่า:</strong> {simulatedRoom.tenantName}</p>
                        <p><strong>หมายเลขห้อง:</strong> ห้องพักเลขที่ {simulatedRoom.number} ชั้นที่ {simulatedRoom.floor}</p>
                        <p><strong>อัตราค่าเช่า:</strong> ฿{simulatedRoom.rent.toLocaleString()} บาทต่อเดือน</p>
                        <p><strong>ข้อตกลงเพิ่มเติม:</strong> ผู้เช่าให้สัญญาว่าจะชำระค่าเช่าตามกำหนด และบำรุงรักษาห้องพักให้อยู่ในสภาพสะอาดเรียบร้อย ห้ามนำสัตว์เลี้ยงเข้ามาเลี้ยงภายในห้องพัก</p>
                        
                        <div className="pt-4 border-t border-dashed mt-4 flex justify-between items-end">
                          <div>
                            <p className="text-[9px] text-gray-400">ลงชื่อ ผู้ให้เช่า</p>
                            <p className="font-semibold text-gray-700 mt-2">ผู้ดูแลหอพัก JadHor</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-gray-400">ลงชื่อ ผู้เช่า</p>
                            {signatureData ? (
                              <p className="font-bold text-[#d4a548] italic mt-2">{signatureData}</p>
                            ) : (
                              <p className="text-red-500 italic mt-2 font-medium">รอลูกบ้านลงชื่อเซ็นสัญญา...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3 Anomaly warning visualization on Owner UI */}
                  {tourStep === 3 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider block">การคำนวณและตรวจสอบมิเตอร์</h4>
                      <div className="p-4 rounded-2xl bg-[#fdf8ee] border border-[#f0ddb0] text-xs">
                        <p className="font-bold text-amber-800 mb-2">ระบบจดบันทึกและระบบตรวจจับความผิดปกติเบื้องหลัง</p>
                        <p className="text-gray-600 leading-relaxed">
                          เมื่อเจ้าของบันทึกค่ามิเตอร์ไฟฟ้า <strong>{electricRead} หน่วย</strong> (เทียบกับค่าตั้งต้นเดิม {simulatedRoom.electricMeterStart} หน่วย) ยอดหน่วยเพิ่มสูงขึ้น {Number(electricRead) - simulatedRoom.electricMeterStart} หน่วย
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs flex gap-3">
                        <AlertTriangle className="text-red-600 shrink-0" size={18} />
                        <div>
                          <p className="font-bold text-red-800">พบการใช้น้ำ/ไฟฟ้าสูงผิดปกติในห้อง {simulatedRoom.number}</p>
                          <p className="text-red-700/90 mt-1 leading-relaxed">
                            ปริมาณหน่วยการใช้พลังงานไฟฟ้าสูงกว่าค่าเฉลี่ยในอดีตเกิน 50% ระบบวิเคราะห์แจ้งว่ามีความเสี่ยงที่จะเกิดกระแสไฟฟ้าลัดวงจร หรือการลืมปิดเครื่องใช้ไฟฟ้าในห้องพักของผู้เช่า
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Invoice Status in Owner Dashboard */}
                  {tourStep === 4 && invoice && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-[#16264c]">ตารางสรุปการเงินตึก</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          invoice.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          สถานะบิล: {invoice.isPaid ? "ชำระเงินเสร็จสิ้น" : "ค้างชำระ"}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-2xl border p-4 space-y-2 text-xs">
                        <div className="flex justify-between font-semibold border-b pb-1 text-gray-500">
                          <span>รายการ</span>
                          <span>จำนวนเงิน</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ค่าเช่าห้องพัก (ห้อง {simulatedRoom.number})</span>
                          <span>฿{simulatedRoom.rent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>ค่าน้ำประปา ({invoice.waterUnits} หน่วย)</span>
                          <span>฿{invoice.waterAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>ค่าไฟฟ้า ({invoice.electricUnits} หน่วย)</span>
                          <span>฿{invoice.electricAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-1.5 text-base mt-2 text-[#16264c]">
                          <span>ยอดรวมในระบบ</span>
                          <span>฿{invoice.total.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {invoice.isPaid && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 text-center font-medium">
                          การโอนเงินของลูกบ้านได้รับการยืนยันและสแกนสลิปโอนผ่าน API สำเร็จ ยอดเงินโอนตรงตามบิล
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View 2: Tenant Mobile LINE UI */}
            {activeTab === "tenant" && (
              <div className="flex-1 flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl">
                {/* Mobile Frame Mock */}
                <div className="w-[320px] h-[480px] bg-white rounded-[36px] border-[8px] border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
                  
                  {/* Status Bar */}
                  <div className="h-6 bg-slate-900 flex items-center justify-between px-6 text-[9px] text-white">
                    <span>12:00 น.</span>
                    <div className="flex items-center gap-1.5">
                      <span>LTE</span>
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                    </div>
                  </div>

                  {/* LINE Header Mock */}
                  <div className="h-11 bg-[#2b394a] flex items-center px-4 gap-2 text-white border-b border-black/10">
                    <div className="w-7 h-7 rounded-full bg-[#d4a548] flex items-center justify-center text-[9px] font-bold">JH</div>
                    <div>
                      <p className="text-[10px] font-bold">JadHor OS Notify</p>
                      <p className="text-[7px] text-blue-200/80">ระบบหอพักตอบรับบิลอัตโนมัติ</p>
                    </div>
                  </div>

                  {/* Chat Content Area */}
                  <div className="flex-1 bg-[#849fc2] p-3 overflow-y-auto space-y-3 flex flex-col justify-end text-[10px]">
                    
                    {/* Chat Bubble: Hello & Welcome if step >= 2 */}
                    {tourStep >= 2 && (
                      <div className="flex items-start gap-1.5 max-w-[85%]">
                        <div className="w-5 h-5 rounded-full bg-[#d4a548] shrink-0 text-[8px] text-white flex items-center justify-center font-bold">JH</div>
                        <div className="bg-white rounded-r-xl rounded-bl-xl p-2 shadow-sm text-gray-700 leading-relaxed">
                          สวัสดีค่ะ คุณ{tenantName} ยินดีต้อนรับเข้าสู่โครงการ อพาร์ตเมนต์ A ห้องพักของคุณพร้อมเข้าอยู่แล้วค่ะ
                        </div>
                      </div>
                    )}

                    {/* Chat Bubble: Invoice and QR link if step >= 4 */}
                    {tourStep === 4 && invoice && (
                      <div className="flex flex-col gap-2">
                        {/* LINE Bill Card Mock */}
                        <div className="flex items-start gap-1.5 max-w-[90%]">
                          <div className="w-5 h-5 rounded-full bg-[#d4a548] shrink-0 text-[8px] text-white flex items-center justify-center font-bold">JH</div>
                          <div className="bg-white rounded-r-xl rounded-bl-xl p-3 shadow-sm text-gray-700 w-full space-y-2">
                            <p className="font-bold text-xs text-[#16264c] border-b pb-1">บิลแจ้งค่าเช่ารายเดือน</p>
                            <p className="text-[9px] text-gray-500">ห้องพัก: {simulatedRoom.number} ประจำรอบเดือนนี้</p>
                            
                            <div className="space-y-1 py-1 border-b text-slate-600">
                              <div className="flex justify-between">
                                <span>ค่าเช่าห้อง:</span>
                                <span>฿{simulatedRoom.rent.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>ค่าน้ำ-ไฟ:</span>
                                <span>฿{(invoice.waterAmount + invoice.electricAmount).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between font-bold text-red-600 text-xs">
                              <span>ยอดที่ต้องชำระ:</span>
                              <span>฿{invoice.total.toLocaleString()}</span>
                            </div>

                            {/* PromptPay QR Simulation inside Line Bubble */}
                            <div className="pt-2 border-t flex flex-col items-center">
                              <p className="text-[8px] font-bold text-gray-400 mb-1">สแกนจ่ายเงินผ่าน PromptPay QR</p>
                              <div className="w-24 h-24 bg-gray-100 rounded border flex items-center justify-center relative">
                                <QrCode size={48} className="text-slate-800" />
                                <div className="absolute inset-0 bg-white/10 flex items-center justify-center"></div>
                              </div>
                              <span className="text-[8px] text-gray-500 font-semibold mt-1">ชื่อผู้รับ: บัญชีหอพักอพาร์ตเมนต์ A</span>
                            </div>
                          </div>
                        </div>

                        {/* LINE Notification payment status */}
                        {invoice.isPaid && (
                          <div className="flex items-start gap-1.5 max-w-[85%]">
                            <div className="w-5 h-5 rounded-full bg-[#d4a548] shrink-0 text-[8px] text-white flex items-center justify-center font-bold">JH</div>
                            <div className="bg-white rounded-r-xl rounded-bl-xl p-2 shadow-sm text-green-700 font-semibold">
                              ได้รับยอดชำระเงินและสลิปของห้อง {simulatedRoom.number} เรียบร้อยแล้วค่ะ ขอบคุณค่ะ
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Input Box Mock */}
                  <div className="h-10 bg-white border-t flex items-center px-3 gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-7 px-3 flex items-center text-[9px] text-gray-400">
                      พิมพ์ข้อความโต้ตอบ...
                    </div>
                    <button className="w-6 h-6 rounded-full bg-[#34508c] flex items-center justify-center text-white text-[9px]">
                      ส่ง
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Highlights summary banner for recruiters */}
          <div className="p-4 rounded-2xl bg-[#efeae0] border border-[#d9d3c5] text-xs space-y-1 text-[#16264c]">
            <p className="font-bold flex items-center gap-1">
              <Sparkles size={14} className="text-[#d4a548]" /> จุดเด่นทางสถาปัตยกรรมของตัวจำลองระบบ (Developer Insight):
            </p>
            <p className="text-gray-600 leading-relaxed mt-1">
              เพื่อรักษาความเป็นเอกเทศของตัวอย่างระบบจำลอง (Demo Isolation) หน้าเว็บนี้ขับเคลื่อนด้วย **React Client-Side State** ทั้งหมด ไม่จำเป็นต้องเข้าถึงฐานข้อมูลหรือสร้างบัญชีจริง ทำงานได้เร็วและไม่กระทบข้อมูลจริงของผลิตภัณฑ์ JadHor OS เหมาะสำหรับการทดสอบเชิงโครงงานอย่างปลอดภัย
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
