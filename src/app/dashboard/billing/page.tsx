"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [propertyId, setPropertyId] = useState("");
  const [roomId, setRoomId] = useState("");
  
  // Bill form state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDate, setDueDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [waterUnits, setWaterUnits] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [electricUnits, setElectricUnits] = useState("");
  const [electricAmount, setElectricAmount] = useState("");
  const [commonFee, setCommonFee] = useState("");
  const [parkingFee, setParkingFee] = useState("");
  const [internetFee, setInternetFee] = useState("");
  const [otherFee, setOtherFee] = useState("");

  // ── โหมดบิล + ฟิลด์บิลเข้าอยู่ (Check-in) ──
  const [billMode, setBillMode] = useState<"MONTHLY" | "CHECKIN">("MONTHLY");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [advanceRent, setAdvanceRent] = useState("");
  const [keyDeposit, setKeyDeposit] = useState("");
  const [vehicleFee, setVehicleFee] = useState("");
  const [leaseStart, setLeaseStart] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isBillsLoading, setIsBillsLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isSendingLineMap, setIsSendingLineMap] = useState<Record<string, boolean>>({});

  const handleSendLineNotify = async (billId: string) => {
    setIsSendingLineMap(prev => ({ ...prev, [billId]: true }));
    try {
      const res = await fetch(`/api/bills/${billId}/notify`, {
        method: "POST"
      });
      
      if (res.ok) {
        toast.success("ส่งบิลแจ้งเตือนเข้าไลน์ลูกบ้านสำเร็จ! 🚀");
      } else {
        const err = await res.json();
        toast.error(err.message || "ส่งข้อความล้มเหลว ตรวจสอบการผูก LINE");
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsSendingLineMap(prev => ({ ...prev, [billId]: false }));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsBillsLoading(true);
      await Promise.all([fetchProperties(), fetchBills()]);
      setIsBillsLoading(false);
    };
    loadData();
  }, []);

  async function fetchProperties() {
    const res = await fetch("/api/properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data);
    }
  };

  async function fetchRooms(propId: string) {
    const res = await fetch(`/api/rooms?propertyId=${propId}`);
    if (res.ok) {
      const data = await res.json();
      setRooms(data);
    }
  };

  async function fetchBills() {
    const res = await fetch("/api/bills");
    if (res.ok) {
      const data = await res.json();
      setBills(data);
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setPropertyId(pId);
    setRoomId("");
    if (pId) fetchRooms(pId);
    else setRooms([]);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rId = e.target.value;
    setRoomId(rId);
    
    // Auto fill rent price if room is selected
    const room = rooms.find(r => r.id === rId);
    if (room) {
      setRentAmount(room.rentPrice.toString());
    }

    // Auto fill default fees from property
    const prop = properties.find(p => p.id === propertyId);
    if (prop) {
      if (prop.defaultCommonFee) setCommonFee(prop.defaultCommonFee.toString());
      else setCommonFee("");

      if (prop.defaultParkingFee) setParkingFee(prop.defaultParkingFee.toString());
      else setParkingFee("");

      if (prop.defaultInternetFee) setInternetFee(prop.defaultInternetFee.toString());
      else setInternetFee("");

      // ── ค่าเริ่มต้นบิลเข้าอยู่ ──
      const rent = room ? Number(room.rentPrice) : 0;
      // เงินประกัน: ใช้ค่าที่ตั้งไว้ ถ้าไม่มี default = ค่าเช่า 1 เดือน
      setSecurityDeposit((prop.defaultSecurityDeposit ?? rent).toString());
      // ค่าเช่าล่วงหน้า: ใช้ค่าที่ตั้งไว้ ถ้าไม่มี default = ค่าเช่า 1 เดือน
      setAdvanceRent((prop.defaultAdvanceRent ?? rent).toString());
      setKeyDeposit((prop.defaultKeyDeposit ?? 0).toString());
      setVehicleFee("0"); // ค่ารถยืดหยุ่นตามผู้เช่า — เริ่มที่ 0 ให้เจ้าของเลือกกรอกเอง
    }
  };

  const setVehiclePreset = (kind: "car" | "motorcycle") => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;
    const fee = kind === "car" ? prop.defaultCarFee : prop.defaultMotorcycleFee;
    setVehicleFee((fee ?? 0).toString());
    if (!fee) toast.info(kind === "car" ? "หอนี้ยังไม่ตั้งค่ารถยนต์ (ฟรี) — แก้ได้ในตั้งค่า" : "หอนี้ยังไม่ตั้งค่ามอเตอร์ไซค์ (ฟรี) — แก้ได้ในตั้งค่า");
  };

  const calculateCheckinTotal = () => {
    return (
      (parseFloat(securityDeposit) || 0) +
      (parseFloat(advanceRent) || 0) +
      (parseFloat(keyDeposit) || 0) +
      (parseFloat(vehicleFee) || 0)
    );
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return toast.error("กรุณาเลือกห้องพัก");
    if (!dueDate) return toast.error("กรุณาระบุวันครบกำหนดชำระ");

    if (
      Number(securityDeposit || 0) < 0 ||
      Number(advanceRent || 0) < 0 ||
      Number(keyDeposit || 0) < 0 ||
      Number(vehicleFee || 0) < 0
    ) {
      return toast.error("จำนวนเงินห้ามติดลบ");
    }
    if (calculateCheckinTotal() <= 0) {
      return toast.error("ยอดรวมบิลเข้าอยู่ต้องมากกว่า 0");
    }

    setIsLoading(true);
    const res = await fetch("/api/bills/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        securityDeposit: Number(securityDeposit || 0),
        advanceRent: Number(advanceRent || 0),
        keyDeposit: Number(keyDeposit || 0),
        vehicleFee: Number(vehicleFee || 0),
        dueDate,
        leaseStart: leaseStart || undefined,
      }),
    });

    if (res.ok) {
      toast.success("ออกบิลเข้าอยู่สำเร็จ! เงินประกันถูกบันทึกลงสัญญาให้อัตโนมัติ");
      fetchBills();
    } else {
      const data = await res.json();
      toast.error(data.message || "เกิดข้อผิดพลาด");
    }
    setIsLoading(false);
  };

  const handleWaterUnitsChange = (val: string) => {
    setWaterUnits(val);
    const prop = properties.find(p => p.id === propertyId);
    if (prop && prop.waterRate && val) {
      const units = parseFloat(val);
      if (!isNaN(units)) {
        setWaterAmount((units * prop.waterRate).toString());
      } else {
        setWaterAmount("");
      }
    } else {
      setWaterAmount("");
    }
  };

  const handleElectricUnitsChange = (val: string) => {
    setElectricUnits(val);
    const prop = properties.find(p => p.id === propertyId);
    if (prop && prop.electricRate && val) {
      const units = parseFloat(val);
      if (!isNaN(units)) {
        setElectricAmount((units * prop.electricRate).toString());
      } else {
        setElectricAmount("");
      }
    } else {
      setElectricAmount("");
    }
  };

  const calculateTotal = () => {
    return (
      (parseFloat(rentAmount) || 0) +
      (parseFloat(waterAmount) || 0) +
      (parseFloat(electricAmount) || 0) +
      (parseFloat(commonFee) || 0) +
      (parseFloat(parkingFee) || 0) +
      (parseFloat(internetFee) || 0) +
      (parseFloat(otherFee) || 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return toast.error("กรุณาเลือกห้องพัก");

    // Front-end validation for negative numbers
    if (
      Number(rentAmount) < 0 ||
      Number(waterAmount || 0) < 0 ||
      Number(electricAmount || 0) < 0 ||
      (waterUnits !== "" && Number(waterUnits) < 0) ||
      (electricUnits !== "" && Number(electricUnits) < 0) ||
      Number(commonFee || 0) < 0 ||
      Number(parkingFee || 0) < 0 ||
      Number(internetFee || 0) < 0 ||
      Number(otherFee || 0) < 0
    ) {
      return toast.error("ข้อมูลการเงินหรือค่าหน่วยมิเตอร์ห้ามมีค่าติดลบ");
    }

    setIsLoading(true);

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId, month, year, dueDate,
        rentAmount, waterUnits, waterAmount, electricUnits, electricAmount,
        commonFee, parkingFee, internetFee, otherFee
      }),
    });

    if (res.ok) {
      toast.success("สร้างบิลสำเร็จ");
      fetchBills();
      // Reset some fields
      setWaterUnits(""); setWaterAmount("");
      setElectricUnits(""); setElectricAmount("");
    } else {
      const data = await res.json();
      toast.error(data.message || "เกิดข้อผิดพลาด");
    }
    
    setIsLoading(false);
  };

  const handleApproveSlip = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        toast.success("อนุมัติบิลสำเร็จ! สถานะเปลี่ยนเป็นชำระแล้ว");
        setSelectedSlip(null);
        fetchBills();
      } else {
        toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--jh-ink)] mb-2">ออกบิล & ค่าน้ำไฟ</h1>
      <p className="text-[15px] text-[var(--jh-ink-secondary)] mb-8">จดเลขมิเตอร์ ระบบคำนวณยอดและสร้างใบแจ้งหนี้ให้อัตโนมัติ</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Create Bill Form */}
        <div className="xl:col-span-1">
          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] p-8">
            <h2 className="text-lg font-semibold text-[var(--jh-ink)] mb-4">สร้างบิลใหม่</h2>

            {/* ── Toggle: บิลรายเดือน / บิลเข้าอยู่ ── */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--jh-surface)] rounded-full border border-black/[0.06] mb-6">
              <button
                type="button"
                onClick={() => setBillMode("MONTHLY")}
                className={`h-9 rounded-full text-sm font-semibold transition-all ${billMode === "MONTHLY" ? "bg-white text-[var(--jh-ink)] shadow-[var(--jh-shadow-sm)]" : "text-[var(--jh-ink-tertiary)]"}`}
              >
                🗓️ บิลรายเดือน
              </button>
              <button
                type="button"
                onClick={() => setBillMode("CHECKIN")}
                className={`h-9 rounded-full text-sm font-semibold transition-all ${billMode === "CHECKIN" ? "bg-white text-[var(--jh-ink)] shadow-[var(--jh-shadow-sm)]" : "text-[var(--jh-ink-tertiary)]"}`}
              >
                🔑 บิลเข้าอยู่
              </button>
            </div>

            {/* ── Shared: เลือกหอ + ห้อง ── */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>อพาร์ตเม้นท์</Label>
                <select className="flex h-11 w-full rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2 text-sm focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)] outline-none transition-shadow" value={propertyId} onChange={handlePropertyChange} required>
                  <option value="" disabled>เลือกอพาร์ตเม้นท์</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>ห้องพัก</Label>
                <select className="flex h-11 w-full rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2 text-sm focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)] outline-none transition-shadow disabled:opacity-50" value={roomId} onChange={handleRoomChange} required disabled={!propertyId}>
                  <option value="" disabled>เลือกห้อง</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.number} {r.status === "OCCUPIED" ? "(มีผู้เช่า)" : ""}</option>)}
                </select>
              </div>
            </div>

            {/* ════════ โหมดบิลรายเดือน ════════ */}
            {billMode === "MONTHLY" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ประจำเดือน</Label>
                    <select className="flex h-11 w-full rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2 text-sm focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)] outline-none transition-shadow" value={month} onChange={e => setMonth(Number(e.target.value))}>
                      {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{i+1}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ปี</Label>
                    <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>กำหนดชำระ</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="h-11 rounded-[var(--jh-radius-md)]" />
                </div>

                <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                  <div className="space-y-2">
                    <Label>ค่าเช่าห้อง (บาท)</Label>
                    <Input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)} required className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--jh-blue)]" />
                        ค่าน้ำ (หน่วย)
                      </Label>
                      <Input type="number" step="0.1" value={waterUnits} onChange={e => handleWaterUnitsChange(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>รวมค่าน้ำ (บาท)</Label>
                      <Input type="number" value={waterAmount} onChange={e => setWaterAmount(e.target.value)} required className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--jh-orange)]" />
                        ค่าไฟ (หน่วย)
                      </Label>
                      <Input type="number" step="0.1" value={electricUnits} onChange={e => handleElectricUnitsChange(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>รวมค่าไฟ (บาท)</Label>
                      <Input type="number" value={electricAmount} onChange={e => setElectricAmount(e.target.value)} required className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                  <p className="font-semibold text-sm text-[var(--jh-ink-secondary)]">ค่าบริการอื่นๆ (ถ้ามี)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ค่าส่วนกลาง</Label>
                      <Input type="number" value={commonFee} onChange={e => setCommonFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าที่จอดรถ</Label>
                      <Input type="number" value={parkingFee} onChange={e => setParkingFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าอินเทอร์เน็ต</Label>
                      <Input type="number" value={internetFee} onChange={e => setInternetFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>อื่นๆ (ค่าปรับ ฯลฯ)</Label>
                      <Input type="number" value={otherFee} onChange={e => setOtherFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[var(--jh-radius-md)] bg-[var(--jh-surface)] px-5 py-4 border border-black/[0.06]">
                  <span className="text-sm font-medium text-[var(--jh-ink-secondary)]">ยอดรวมที่จะเรียกเก็บ</span>
                  <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums text-[var(--jh-ink)]">฿{calculateTotal().toLocaleString()}</span>
                </div>

                <Button type="submit" className="w-full h-11 rounded-full bg-[var(--jh-blue)] hover:bg-[var(--jh-blue-dark)] text-white font-semibold shadow-[var(--jh-shadow-sm)] transition-all active:scale-[0.99]" disabled={isLoading}>
                  {isLoading ? "กำลังบันทึก..." : "ออกใบแจ้งหนี้"}
                </Button>
              </form>
            )}

            {/* ════════ โหมดบิลเข้าอยู่ (Check-in) ════════ */}
            {billMode === "CHECKIN" && (
              <form onSubmit={handleCheckinSubmit} className="space-y-4">
                <div className="rounded-[var(--jh-radius-md)] bg-[var(--jh-blue-tint)] border border-[var(--jh-blue)]/20 px-4 py-3 text-xs text-[var(--jh-blue-dark)] leading-relaxed">
                  💡 บิลเข้าอยู่ออกครั้งเดียวตอนรับผู้เช่าใหม่ — เงินประกันจะถูกบันทึกลงสัญญาเช่าให้อัตโนมัติ และลูกบ้านต้องจ่ายบิลนี้ก่อนจึงจะเซ็นสัญญาได้
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันเริ่มสัญญา (ถ้ามี)</Label>
                    <Input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>กำหนดชำระ</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                </div>

                <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                  <div className="space-y-2">
                    <Label>เงินประกันห้อง (คืนตอนย้ายออก)</Label>
                    <Input type="number" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} placeholder="0" className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>ค่าเช่าล่วงหน้า</Label>
                    <Input type="number" value={advanceRent} onChange={e => setAdvanceRent(e.target.value)} placeholder="0" className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>ค่ามัดจำกุญแจ / คีย์การ์ด</Label>
                    <Input type="number" value={keyDeposit} onChange={e => setKeyDeposit(e.target.value)} placeholder="0" className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>ค่าลงทะเบียน / ที่จอดรถ</Label>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setVehiclePreset("car")} className="px-2.5 py-1 rounded-full bg-white border border-[var(--jh-border)] text-[11px] font-semibold text-[var(--jh-ink-secondary)] hover:bg-[var(--jh-surface)] transition-colors">🚗 รถยนต์</button>
                        <button type="button" onClick={() => setVehiclePreset("motorcycle")} className="px-2.5 py-1 rounded-full bg-white border border-[var(--jh-border)] text-[11px] font-semibold text-[var(--jh-ink-secondary)] hover:bg-[var(--jh-surface)] transition-colors">🏍️ มอ'ไซค์</button>
                      </div>
                    </div>
                    <Input type="number" value={vehicleFee} onChange={e => setVehicleFee(e.target.value)} placeholder="0 = ฟรี" className="h-11 rounded-[var(--jh-radius-md)]" />
                    <p className="text-[11px] text-[var(--jh-ink-tertiary)]">กดปุ่มเพื่อเติมค่าเริ่มต้นตามชนิดรถ หรือพิมพ์เอง • ใส่ 0 = จอดฟรี</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[var(--jh-radius-md)] bg-[var(--jh-surface)] px-5 py-4 border border-black/[0.06]">
                  <span className="text-sm font-medium text-[var(--jh-ink-secondary)]">ยอดรวมบิลเข้าอยู่</span>
                  <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums text-[var(--jh-ink)]">฿{calculateCheckinTotal().toLocaleString()}</span>
                </div>

                <Button type="submit" className="w-full h-11 rounded-full bg-[var(--jh-blue)] hover:bg-[var(--jh-blue-dark)] text-white font-semibold shadow-[var(--jh-shadow-sm)] transition-all active:scale-[0.99]" disabled={isLoading}>
                  {isLoading ? "กำลังบันทึก..." : "ออกบิลเข้าอยู่"}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Bills List */}
        <div className="xl:col-span-2">
          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06]">
              <h2 className="text-lg font-semibold text-[var(--jh-ink)]">รายการบิลทั้งหมด</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">ห้อง</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">รอบบิล</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">ยอดรวม</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">สถานะ</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--jh-ink-tertiary)]">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {isBillsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-black/[0.04] animate-pulse">
                        <td className="px-5 py-3.5">
                          <div className="h-4 bg-[var(--jh-surface)] rounded w-16 mb-1" />
                          <div className="h-3 bg-[var(--jh-surface)] rounded w-24" />
                        </td>
                        <td className="px-5 py-3.5"><div className="h-4 bg-[var(--jh-surface)] rounded w-12" /></td>
                        <td className="px-5 py-3.5"><div className="h-4 bg-[var(--jh-surface)] rounded w-20" /></td>
                        <td className="px-5 py-3.5"><div className="h-6 bg-[var(--jh-surface)] rounded-full w-16" /></td>
                        <td className="px-5 py-3.5 text-right"><div className="h-8 bg-[var(--jh-surface)] rounded-full w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : bills.map(bill => (
                    <tr key={bill.id} className="border-b border-black/[0.04] hover:bg-[var(--jh-surface)] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[var(--jh-ink)]">
                        <div className="flex items-center gap-2">
                          {bill.room.number}
                          {bill.type === "CHECKIN" && (
                            <span className="inline-flex items-center h-5 px-2 rounded-full bg-[var(--jh-blue-tint)] text-[var(--jh-blue-dark)] text-[10px] font-bold">🔑 เข้าอยู่</span>
                          )}
                        </div>
                        <div className="text-xs font-normal text-[var(--jh-ink-tertiary)]">{bill.room.property.name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--jh-ink-secondary)]">{bill.type === "CHECKIN" ? "—" : `${bill.month}/${bill.year}`}</td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-[var(--jh-ink)]">฿{bill.totalAmount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${
                          bill.status === "PAID"
                            ? "bg-[var(--jh-green-tint)] text-[var(--jh-green-ink)]"
                            : bill.status === "PENDING"
                            ? "bg-[var(--jh-orange-tint)] text-[var(--jh-orange-ink)]"
                            : bill.status === "UNPAID"
                            ? "bg-[var(--jh-red-tint)] text-[var(--jh-red)]"
                            : "bg-[var(--jh-surface)] text-[var(--jh-ink-secondary)]"
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {bill.status === "PAID" ? "ชำระแล้ว" : bill.status === "PENDING" ? "รอตรวจสอบ" : bill.status === "UNPAID" ? "ยังไม่ชำระ" : bill.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {bill.status === "PENDING" && (
                            <Button variant="default" size="sm" className="rounded-full bg-[var(--jh-orange)] hover:bg-[var(--jh-orange-ink)] text-white text-xs h-8 px-3" onClick={() => setSelectedSlip(bill)}>
                              ตรวจสอบสลิป
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="rounded-full border-[var(--jh-border)] text-[var(--jh-ink-secondary)] text-xs h-8 px-3 hover:bg-[var(--jh-surface)]" onClick={() => window.open(`/dashboard/billing/${bill.id}/print`, '_blank')}>
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            พิมพ์
                          </Button>
                          {bill.room?.tenants?.[0]?.lineUserId ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="rounded-full bg-[var(--jh-green-ink)] hover:opacity-90 text-white text-xs h-8 px-3"
                              onClick={() => handleSendLineNotify(bill.id)}
                              disabled={isSendingLineMap[bill.id]}
                            >
                              {isSendingLineMap[bill.id] ? "กำลังส่ง..." : "ส่ง LINE"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-[var(--jh-border)] text-[var(--jh-blue)] hover:bg-[var(--jh-blue-tint)] text-xs h-8 px-3"
                              onClick={() => {
                                const payLink = `${window.location.origin}/pay/${bill.id}`;
                                navigator.clipboard.writeText(payLink);
                                toast.success("คัดลอกลิงก์สำหรับชำระเงินเรียบร้อยแล้ว! (คุณสามารถนำไปวางส่งให้ลูกบ้านในช่องทางอื่นได้ทันที)");
                              }}
                            >
                              คัดลอกลิงก์บิล
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isBillsLoading && bills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[var(--jh-ink-tertiary)]">
                        ยังไม่มีข้อมูลบิลในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-[#1D1D1F]">ตรวจสอบหลักฐานการโอนเงิน</h3>
              <button onClick={() => setSelectedSlip(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-auto bg-slate-100/50 flex flex-col items-center">
              <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">ห้องพัก:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.room.number}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-500">ยอดที่ต้องชำระ:</span>
                  <span className="font-bold text-blue-600">฿{selectedSlip.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">เวลาที่ส่งสลิป:</span>
                  <span className="text-slate-700">{selectedSlip.paymentDate ? new Date(selectedSlip.paymentDate).toLocaleString("th-TH") : "-"}</span>
                </div>
              </div>

              {selectedSlip.slipUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedSlip.slipUrl} alt="Payment Slip" className="w-full max-w-[300px] object-contain rounded-xl shadow-md border border-slate-200" />
              ) : (
                <div className="p-8 text-slate-400 text-center">ไม่มีรูปภาพสลิป</div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full border-slate-200 h-12" onClick={() => setSelectedSlip(null)}>
                ปิด
              </Button>
              <Button className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-sm" onClick={() => handleApproveSlip(selectedSlip.id)}>
                อนุมัติรับเงิน
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
