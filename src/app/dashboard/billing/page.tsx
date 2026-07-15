"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Send, BellRing, Pencil, Trash2, Download, Ban } from "lucide-react";
import { waiveBill } from "@/app/actions/payment-approval";

export default function BillingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
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
  const [billMode, setBillMode] = useState<"MONTHLY" | "CHECKIN" | "BULK">("MONTHLY");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [advanceRent, setAdvanceRent] = useState("");
  const [keyDeposit, setKeyDeposit] = useState("");
  const [vehicleFee, setVehicleFee] = useState("");
  const [leaseStart, setLeaseStart] = useState("");

  // ─── SWR: cache shared กับหน้า rooms/meters ───────────────────────
  const { data: properties = [] } = useSWR<any[]>("/api/properties");
  const { data: bills = [], isLoading: isBillsLoading, mutate: mutateBills } =
    useSWR<any[]>("/api/bills");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  // ── แก้ไข / ลบ บิล ──
  const [editBill, setEditBill] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [waivingId, setWaivingId] = useState<string | null>(null);

  const [isSendingLineMap, setIsSendingLineMap] = useState<Record<string, boolean>>({});
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertCount, setAlertCount] = useState<number | null>(null);

  // โหลดจำนวนบิลที่ต้องแจ้งเตือน
  useEffect(() => {
    fetch("/api/bills/smart-alert")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count !== undefined) setAlertCount(d.count); })
      .catch(() => {});
  }, [bills]);

  // ดึงค่าเริ่มต้นของหอเมื่อสลับเป็นโหมดออกยกหอ (BULK)
  useEffect(() => {
    if (billMode === "BULK" && propertyId) {
      const prop = properties.find(p => p.id === propertyId);
      if (prop) {
        setCommonFee(prop.defaultCommonFee ? prop.defaultCommonFee.toString() : "");
        setParkingFee(prop.defaultParkingFee ? prop.defaultParkingFee.toString() : "");
        setInternetFee(prop.defaultInternetFee ? prop.defaultInternetFee.toString() : "");
      }
    }
  }, [billMode, propertyId, properties]);

  const handleSmartAlert = async () => {
    setIsSendingAlert(true);
    try {
      const res = await fetch("/api/bills/smart-alert", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.sent === 0) toast.info(data.message || "ไม่มีบิลที่ต้องแจ้งเตือน");
        else if (data.failed === 0) toast.success(`✅ ${data.message}`);
        else toast.warning(`⚠️ ${data.message}`);
        setAlertCount(0);
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    } finally {
      setIsSendingAlert(false);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportBillsCsv() {
    if (bills.length === 0) { toast.info("ไม่มีข้อมูลบิลสำหรับ Export"); return; }

    const thaiMonthsCSV = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const statusMap: Record<string, string> = {
      UNPAID: "รอชำระ", PENDING: "รอตรวจสอบ",
      PAID: "ชำระแล้ว", OVERDUE: "เลยกำหนด", PARTIAL: "จ่ายบางส่วน",
      WAIVED: "ยกเว้น",
    };

    const header = ["ห้อง","ประเภท","งวด","สถานะ","ค่าเช่า","ค่าน้ำ","ค่าไฟ","ค่าส่วนกลาง","ค่าจอดรถ","ค่าเน็ต","อื่นๆ","รวม","ชำระแล้ว","ยังค้าง","กำหนดชำระ"];
    const rows = bills.map((b: any) => [
      b.room?.number ?? "-",
      b.type === "CHECKIN" ? "บิลเข้าอยู่" : "รายเดือน",
      b.type === "CHECKIN" ? "เข้าอยู่" : `${thaiMonthsCSV[b.month - 1]} ${b.year + 543}`,
      statusMap[b.status] ?? b.status,
      b.rentAmount,
      b.waterAmount,
      b.electricAmount,
      b.commonFee,
      b.parkingFee,
      b.internetFee,
      b.otherFee,
      b.totalAmount,
      b.paidAmount,
      Math.max(0, b.totalAmount - b.paidAmount).toFixed(2),
      new Date(b.dueDate).toLocaleDateString("th-TH"),
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // BOM for Thai UTF-8 in Excel
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`📊 Export สำเร็จ ${bills.length} รายการ`);
  }

  const handleSendAllLine = async () => {
    const lineableBills = bills.filter(b => b.room?.tenants?.[0]?.lineUserId);
    if (lineableBills.length === 0) {
      toast.info("ไม่มีผู้เช่าที่ผูก LINE ในรายการบิลนี้");
      return;
    }
    setIsSendingAll(true);
    const results = await Promise.allSettled(
      lineableBills.map(b =>
        fetch(`/api/bills/${b.id}/notify`, { method: "POST" }).then(r => ({ ok: r.ok }))
      )
    );
    const success = results.filter(r => r.status === "fulfilled" && (r as any).value.ok).length;
    const failed = results.length - success;
    if (failed === 0) {
      toast.success(`ส่ง LINE สำเร็จทั้งหมด ${success} ห้อง 🎉`);
    } else if (success > 0) {
      toast.warning(`ส่งสำเร็จ ${success} ห้อง · ล้มเหลว ${failed} ห้อง`);
    } else {
      toast.error(`ส่งล้มเหลวทั้งหมด ${failed} ห้อง — ตรวจสอบการตั้งค่า LINE`);
    }
    setIsSendingAll(false);
  };

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

  async function fetchRooms(propId: string) {
    const res = await fetch(`/api/rooms?propertyId=${propId}`);
    if (res.ok) {
      const data = await res.json();
      setRooms(data);
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
      mutateBills();
    } else {
      const data = await res.json();
      toast.error(data.message || "เกิดข้อผิดพลาด");
    }
    setIsLoading(false);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return toast.error("กรุณาเลือกอพาร์ตเม้นท์");
    if (!dueDate) return toast.error("กรุณาระบุวันครบกำหนดชำระ");

    setIsLoading(true);
    try {
      const res = await fetch("/api/bills/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          month,
          year,
          dueDate,
          commonFee: commonFee ? Number(commonFee) : undefined,
          parkingFee: parkingFee ? Number(parkingFee) : undefined,
          internetFee: internetFee ? Number(internetFee) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        let msg = `ออกบิลเสร็จสิ้น: สร้างใหม่ ${data.created?.length || 0} ห้อง`;
        if (data.skipped?.length > 0) {
          msg += ` (ข้าม ${data.skipped.length} ห้องที่มีบิลแล้ว)`;
        }
        if (data.errors?.length > 0) {
          msg += ` (มีข้อผิดพลาด ${data.errors.length} ห้อง)`;
        }
        toast.success(msg);
        mutateBills();
      } else {
        toast.error(data.message || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsLoading(false);
    }
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
      mutateBills();
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
        mutateBills();
      } else {
        toast.error("เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  // เปิด modal แก้ไข — เติมค่าจากบิลเดิม
  const openEdit = (bill: any) => {
    setEditBill(bill);
    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));
    if (bill.type === "CHECKIN") {
      setEditForm({
        securityDeposit: toStr(bill.securityDeposit),
        advanceRent: toStr(bill.advanceRent),
        keyDeposit: toStr(bill.keyDeposit),
        vehicleFee: toStr(bill.vehicleFee),
        dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().slice(0, 10) : "",
      });
    } else {
      setEditForm({
        rentAmount: toStr(bill.rentAmount),
        waterUnits: toStr(bill.waterUnits),
        waterAmount: toStr(bill.waterAmount),
        electricUnits: toStr(bill.electricUnits),
        electricAmount: toStr(bill.electricAmount),
        commonFee: toStr(bill.commonFee),
        parkingFee: toStr(bill.parkingFee),
        internetFee: toStr(bill.internetFee),
        otherFee: toStr(bill.otherFee),
        dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().slice(0, 10) : "",
      });
    }
  };

  const setEF = (key: string, val: string) => setEditForm(prev => ({ ...prev, [key]: val }));

  const editTotal = () => {
    if (!editBill) return 0;
    if (editBill.type === "CHECKIN") {
      return (
        (parseFloat(editForm.securityDeposit) || 0) +
        (parseFloat(editForm.advanceRent) || 0) +
        (parseFloat(editForm.keyDeposit) || 0) +
        (parseFloat(editForm.vehicleFee) || 0)
      );
    }
    return (
      (parseFloat(editForm.rentAmount) || 0) +
      (parseFloat(editForm.waterAmount) || 0) +
      (parseFloat(editForm.electricAmount) || 0) +
      (parseFloat(editForm.commonFee) || 0) +
      (parseFloat(editForm.parkingFee) || 0) +
      (parseFloat(editForm.internetFee) || 0) +
      (parseFloat(editForm.otherFee) || 0)
    );
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBill) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/bills/${editBill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success("แก้ไขบิลสำเร็จ");
        setEditBill(null);
        mutateBills();
      } else {
        const data = await res.json();
        toast.error(data.message || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBill = async (bill: any) => {
    const ok = window.confirm(
      `ต้องการลบบิลห้อง ${bill.room.number}${bill.type === "CHECKIN" ? " (บิลเข้าอยู่)" : ` รอบ ${bill.month}/${bill.year + 543}`} ใช่หรือไม่?\n\nบิลจะถูกนำออกจากรายการและลูกบ้านจะไม่เห็นบิลนี้อีก`
    );
    if (!ok) return;
    setDeletingId(bill.id);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ลบบิลสำเร็จ");
        mutateBills();
      } else {
        const data = await res.json();
        toast.error(data.message || "ลบบิลไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setDeletingId(null);
    }
  };

  const handleWaiveBill = async (bill: any) => {
    const reason = window.prompt(
      `ยกเว้นบิลห้อง ${bill.room.number}${bill.type === "CHECKIN" ? " (บิลเข้าอยู่)" : ` รอบ ${bill.month}/${bill.year + 543}`} — ต่างจากลบ: ประวัติจะยังอยู่ และลูกบ้านจะเห็นว่าได้รับการยกเว้น\n\nระบุเหตุผล (บังคับกรอก):`
    );
    if (reason === null) return; // กดยกเลิก
    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ยกเว้นบิลนี้");
      return;
    }
    setWaivingId(bill.id);
    try {
      const result = await waiveBill(bill.id, reason);
      if (result.success) {
        toast.success("ยกเว้นบิลสำเร็จ");
        mutateBills();
      } else {
        toast.error(result.error || "ยกเว้นบิลไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setWaivingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--jh-radius-md)]"
          style={{ background: "#ff3b30", color: "#fff", boxShadow: "0 10px 22px -8px #ff3b30" }}
        >
          <Receipt className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-[var(--jh-ink)]">ออกบิล & ค่าน้ำไฟ</h1>
          <p className="text-[15px] text-[var(--jh-ink-secondary)] mt-0.5">จดเลขมิเตอร์ ระบบคำนวณยอดและสร้างใบแจ้งหนี้ให้อัตโนมัติ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Create Bill Form */}
        <div className="xl:col-span-1">
          <div className="rounded-[var(--jh-radius-2xl)] border border-black/[0.06] bg-white shadow-[var(--jh-shadow-card)] p-8">
            <h2 className="text-lg font-semibold text-[var(--jh-ink)] mb-4">สร้างบิลใหม่</h2>

            {/* ── Toggle: บิลรายเดือน / บิลยกหอ / บิลเข้าอยู่ ── */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--jh-surface)] rounded-full border border-black/[0.06] mb-6">
              <button
                type="button"
                onClick={() => setBillMode("MONTHLY")}
                className={`h-9 rounded-full font-semibold transition-all ${billMode === "MONTHLY" ? "bg-white text-[var(--jh-ink)] shadow-[var(--jh-shadow-sm)]" : "text-[var(--jh-ink-tertiary)]"}`}
                style={{ fontSize: "11px" }}
              >
                🗓️ รายเดือน
              </button>
              <button
                type="button"
                onClick={() => setBillMode("BULK")}
                className={`h-9 rounded-full font-semibold transition-all ${billMode === "BULK" ? "bg-white text-[var(--jh-ink)] shadow-[var(--jh-shadow-sm)]" : "text-[var(--jh-ink-tertiary)]"}`}
                style={{ fontSize: "11px" }}
              >
                ⚡ ออกยกหอ
              </button>
              <button
                type="button"
                onClick={() => setBillMode("CHECKIN")}
                className={`h-9 rounded-full font-semibold transition-all ${billMode === "CHECKIN" ? "bg-white text-[var(--jh-ink)] shadow-[var(--jh-shadow-sm)]" : "text-[var(--jh-ink-tertiary)]"}`}
                style={{ fontSize: "11px" }}
              >
                🔑 เข้าอยู่
              </button>
            </div>

            {/* ── Shared: เลือกหอ + ห้อง ── */}
            <div className={`grid grid-cols-1 ${billMode === "BULK" ? "" : "sm:grid-cols-2"} gap-4 mb-4`}>
              <div className="space-y-2">
                <Label>อพาร์ตเม้นท์</Label>
                <select className="flex h-11 w-full rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2 text-sm focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)] outline-none transition-shadow" value={propertyId} onChange={handlePropertyChange} required>
                  <option value="" disabled>เลือกอพาร์ตเม้นท์</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {billMode !== "BULK" && (
                <div className="space-y-2">
                  <Label>ห้องพัก</Label>
                  <select className="flex h-11 w-full rounded-[var(--jh-radius-md)] border border-[var(--jh-border)] bg-white px-3.5 py-2 text-sm focus:border-[var(--jh-blue)] focus:ring-4 focus:ring-[var(--jh-focus-ring)] outline-none transition-shadow disabled:opacity-50" value={roomId} onChange={handleRoomChange} required disabled={!propertyId}>
                    <option value="" disabled>เลือกห้อง</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.number} {r.status === "OCCUPIED" ? "(มีผู้เช่า)" : ""}</option>)}
                  </select>
                </div>
              )}
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

            {/* ════════ โหมดออกบิลยกหอ (Bulk) ════════ */}
            {billMode === "BULK" && (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="rounded-[var(--jh-radius-md)] bg-[var(--jh-blue-tint)] border border-[var(--jh-blue)]/20 px-4 py-3 text-xs text-[var(--jh-blue-dark)] leading-relaxed">
                  💡 ออกบิลรายเดือนพื้นฐาน (ค่าเช่าและค่าบริการคงที่) ให้กับห้องที่มีผู้เช่าอยู่ทั้งหมดพร้อมกันในคลิกเดียว (ข้ามห้องที่เคยออกบิลแล้วเพื่อป้องกันการซ้ำซ้อน)
                </div>

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
                  <p className="font-semibold text-[13px] text-[var(--jh-ink-secondary)] leading-snug">ค่าบริการทั่วไป (ดึงค่าเริ่มต้นของหอพักนี้มาให้ หากต้องการแก้ไขเฉพาะรอบนี้สามารถปรับได้)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ค่าส่วนกลาง</Label>
                      <Input type="number" value={commonFee} onChange={e => setCommonFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2">
                      <Label>ค่าที่จอดรถ</Label>
                      <Input type="number" value={parkingFee} onChange={e => setParkingFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="space-y-2 flex-1 col-span-2">
                      <Label>ค่าอินเทอร์เน็ต</Label>
                      <Input type="number" value={internetFee} onChange={e => setInternetFee(e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 rounded-full bg-[var(--jh-blue)] hover:bg-[var(--jh-blue-dark)] text-white font-semibold shadow-[var(--jh-shadow-sm)] transition-all active:scale-[0.99]" disabled={isLoading}>
                  {isLoading ? "กำลังออกบิลทั้งหมด..." : "ออกบิลรายเดือนยกหอ ⚡"}
                </Button>
              </form>
            )}

            {/* ════════ โหมดบิลเข้าอยู่ (Check-in) ════════ */}
            {billMode === "CHECKIN" && (
              <form onSubmit={handleCheckinSubmit} className="space-y-4">
                <div className="rounded-[var(--jh-radius-md)] bg-[var(--jh-blue-tint)] border border-[var(--jh-blue)]/20 px-4 py-3 text-xs text-[var(--jh-blue-dark)] leading-relaxed">
                  💡 บิลเข้าอยู่ออกครั้งเดียวตอนรับผู้เช่าใหม่ — เงินประกันจะถูกบันทึกลงสัญญาเช่าให้อัตโนมัติ และลูกบ้านต้องจ่ายบิลนี้ก่อนจึงจะเซ็นสัญญาได้
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="flex items-center gap-2">
              {/* Smart Alert button */}
              {alertCount !== null && alertCount > 0 && (
                <Button
                  size="sm"
                  className="relative rounded-full h-9 px-4 gap-2 text-white font-semibold text-xs transition-all hover:-translate-y-0.5"
                  style={{ background: "#d4a548", boxShadow: "0 8px 18px -6px #d4a548" }}
                  onClick={handleSmartAlert}
                  disabled={isSendingAlert}
                >
                  <BellRing className="w-3.5 h-3.5" strokeWidth={2} />
                  {isSendingAlert ? "กำลังส่ง..." : `Smart Alert (${alertCount} ห้อง)`}
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                    {alertCount}
                  </span>
                </Button>
              )}
              {bills.filter(b => b.room?.tenants?.[0]?.lineUserId).length > 0 && (
                <Button
                  size="sm"
                  className="rounded-full h-9 px-4 gap-2 text-white font-semibold text-xs transition-all hover:-translate-y-0.5"
                  style={{
                    background: "#34c759",
                    boxShadow: "0 8px 18px -6px #34c759",
                  }}
                  onClick={handleSendAllLine}
                  disabled={isSendingAll}
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={2} />
                  {isSendingAll
                    ? "กำลังส่ง..."
                    : `ส่ง LINE ทั้งหมด (${bills.filter(b => b.room?.tenants?.[0]?.lineUserId).length} ห้อง)`}
                </Button>
              )}
              {/* Export CSV button */}
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-9 px-4 gap-2 font-semibold text-xs border-slate-200 hover:bg-slate-50 transition-all hover:-translate-y-0.5"
                onClick={exportBillsCsv}
                title="Export เป็น CSV"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2} />
                Export CSV
              </Button>
              </div>
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
                      <td className="px-5 py-3.5 text-[var(--jh-ink-secondary)]">{bill.type === "CHECKIN" ? "—" : `${bill.month}/${bill.year + 543}`}</td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-[var(--jh-ink)]">฿{bill.totalAmount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${
                          bill.status === "PAID"
                            ? "bg-[var(--jh-green-tint)] text-[var(--jh-green-ink)]"
                            : bill.status === "PENDING"
                            ? "bg-[var(--jh-orange-tint)] text-[var(--jh-orange-ink)]"
                            : bill.status === "UNPAID"
                            ? "bg-[var(--jh-red-tint)] text-[var(--jh-red)]"
                            : bill.status === "WAIVED"
                            ? "bg-[var(--jh-indigo-tint)] text-[var(--jh-indigo)]"
                            : "bg-[var(--jh-surface)] text-[var(--jh-ink-secondary)]"
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {bill.status === "PAID" ? "ชำระแล้ว" : bill.status === "PENDING" ? "รอตรวจสอบ" : bill.status === "UNPAID" ? "ยังไม่ชำระ" : bill.status === "WAIVED" ? "ยกเว้นแล้ว" : bill.status}
                        </span>
                        {bill.status === "WAIVED" && bill.waivedReason && (
                          <div className="text-[10px] text-[var(--jh-ink-tertiary)] mt-1 max-w-[160px] truncate" title={bill.waivedReason}>
                            เหตุผล: {bill.waivedReason}
                          </div>
                        )}
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
                          {bill.status !== "PAID" && bill.status !== "WAIVED" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-[var(--jh-border)] text-[var(--jh-ink-secondary)] text-xs h-8 px-3 hover:bg-[var(--jh-surface)]"
                                onClick={() => openEdit(bill)}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                                แก้ไข
                              </Button>
                              {role === "OWNER" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full border-[var(--jh-indigo)]/30 text-[var(--jh-indigo)] text-xs h-8 px-3 hover:bg-[var(--jh-indigo-tint)]"
                                  onClick={() => handleWaiveBill(bill)}
                                  disabled={waivingId === bill.id}
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                                  {waivingId === bill.id ? "กำลังยกเว้น..." : "ยกเว้น"}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-[var(--jh-red)]/30 text-[var(--jh-red)] text-xs h-8 px-3 hover:bg-[var(--jh-red-tint)]"
                                onClick={() => handleDeleteBill(bill)}
                                disabled={deletingId === bill.id}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                                {deletingId === bill.id ? "กำลังลบ..." : "ลบ"}
                              </Button>
                            </>
                          )}
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

      {/* Edit Bill Modal */}
      {editBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleUpdateBill}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-[#1D1D1F]">แก้ไขบิล</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ห้อง {editBill.room.number}
                  {editBill.type === "CHECKIN" ? " · บิลเข้าอยู่" : ` · รอบ ${editBill.month}/${editBill.year + 543}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditBill(null)}
                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto space-y-4">
              {editBill.type === "CHECKIN" ? (
                <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                  <div className="space-y-2">
                    <Label>เงินประกันห้อง</Label>
                    <Input type="number" value={editForm.securityDeposit} onChange={e => setEF("securityDeposit", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>ค่าเช่าล่วงหน้า</Label>
                    <Input type="number" value={editForm.advanceRent} onChange={e => setEF("advanceRent", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>ค่ามัดจำกุญแจ / คีย์การ์ด</Label>
                    <Input type="number" value={editForm.keyDeposit} onChange={e => setEF("keyDeposit", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                  <div className="space-y-2">
                    <Label>ค่าลงทะเบียน / ที่จอดรถ</Label>
                    <Input type="number" value={editForm.vehicleFee} onChange={e => setEF("vehicleFee", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                    <div className="space-y-2">
                      <Label>ค่าเช่าห้อง (บาท)</Label>
                      <Input type="number" value={editForm.rentAmount} onChange={e => setEF("rentAmount", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--jh-blue)]" />ค่าน้ำ (หน่วย)</Label>
                        <Input type="number" step="0.1" value={editForm.waterUnits} onChange={e => setEF("waterUnits", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                      <div className="space-y-2">
                        <Label>รวมค่าน้ำ (บาท)</Label>
                        <Input type="number" value={editForm.waterAmount} onChange={e => setEF("waterAmount", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[var(--jh-orange)]" />ค่าไฟ (หน่วย)</Label>
                        <Input type="number" step="0.1" value={editForm.electricUnits} onChange={e => setEF("electricUnits", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                      <div className="space-y-2">
                        <Label>รวมค่าไฟ (บาท)</Label>
                        <Input type="number" value={editForm.electricAmount} onChange={e => setEF("electricAmount", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--jh-ink-tertiary)]">ระบบคำนวณค่าน้ำ/ไฟใหม่จากหน่วย × เรตของหอเสมอ (ถ้ามี)</p>
                  </div>

                  <div className="bg-[var(--jh-surface)] p-4 rounded-[var(--jh-radius-lg)] space-y-4 border border-black/[0.06]">
                    <p className="font-semibold text-sm text-[var(--jh-ink-secondary)]">ค่าบริการอื่นๆ</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ค่าส่วนกลาง</Label>
                        <Input type="number" value={editForm.commonFee} onChange={e => setEF("commonFee", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                      <div className="space-y-2">
                        <Label>ค่าที่จอดรถ</Label>
                        <Input type="number" value={editForm.parkingFee} onChange={e => setEF("parkingFee", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                      <div className="space-y-2">
                        <Label>ค่าอินเทอร์เน็ต</Label>
                        <Input type="number" value={editForm.internetFee} onChange={e => setEF("internetFee", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>อื่นๆ (ค่าปรับ ฯลฯ)</Label>
                          {editBill.dueDate && new Date(editBill.dueDate) < new Date() && (
                            <button
                              type="button"
                              onClick={() => {
                                const due = new Date(editBill.dueDate);
                                const now = new Date();
                                now.setHours(0, 0, 0, 0);
                                const diffTime = now.getTime() - due.getTime();
                                const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                                if (diffDays > 0) {
                                  const rate = window.prompt(`บิลนี้เลยกำหนดชำระแล้ว ${diffDays} วัน\nกรุณากรอกค่าปรับต่อวัน (บาท)\nหรือกดตกลงเพื่อคำนวณวันละ 50 บาท`, "50");
                                  if (rate !== null) {
                                    const parsedRate = parseFloat(rate) || 0;
                                    setEF("otherFee", String(parsedRate * diffDays));
                                    toast.success(`คำนวณค่าปรับสำเร็จ: ${diffDays} วัน × ฿${parsedRate} = ฿${parsedRate * diffDays}`);
                                  }
                                } else {
                                  toast.info("บิลนี้ยังไม่เลยกำหนดชำระ");
                                }
                              }}
                              className="text-[10px] font-bold text-[var(--jh-blue)] hover:underline cursor-pointer"
                            >
                              ⚡ คำนวณค่าปรับ
                            </button>
                          )}
                        </div>
                        <Input type="number" value={editForm.otherFee} onChange={e => setEF("otherFee", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>กำหนดชำระ</Label>
                <Input type="date" value={editForm.dueDate} onChange={e => setEF("dueDate", e.target.value)} className="h-11 rounded-[var(--jh-radius-md)]" />
              </div>

              <div className="flex items-center justify-between rounded-[var(--jh-radius-md)] bg-[var(--jh-surface)] px-5 py-4 border border-black/[0.06]">
                <span className="text-sm font-medium text-[var(--jh-ink-secondary)]">ยอดรวมใหม่</span>
                <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums text-[var(--jh-ink)]">฿{editTotal().toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded-full border-slate-200 h-12" onClick={() => setEditBill(null)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 rounded-full bg-[var(--jh-blue)] hover:bg-[var(--jh-blue-dark)] text-white font-bold h-12 shadow-sm" disabled={isSavingEdit}>
                {isSavingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
