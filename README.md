# RF + Smith Chart Lab

เว็บแล็บสอน Smith Chart ที่ให้ผู้เรียน **ลากอุปกรณ์ R / L / C / สายส่ง / สตับ มาสร้างวงจร** แล้วเห็นเส้นทางทั้งหมด

```
Circuit → X_L / X_C → Z_L → z_L → Smith Chart → SWR → Matching
```

หน้าจอหลักแบ่งเป็น 4 ส่วน: **COMPONENTS** (ซ้าย) · **CIRCUIT CANVAS** (กลาง) · **SMITH CHART** (ขวา) · **STEP-BY-STEP EXPLANATION** (ล่าง)

## วิธีรัน

```bash
npm install
npm run dev        # เปิด http://localhost:5173 (หรือ http://127.0.0.1:5173)
npm run build      # สร้างไฟล์ static ใน dist/ (deploy ได้ทุกที่ เช่น GitHub Pages)
npm test           # ทดสอบ engine คำนวณกับตัวอย่างในหนังสือ (Pozar)
```

## โครงสร้าง 4 Engine (`src/engine/`)

| ไฟล์ | Engine | หน้าที่ |
|---|---|---|
| `circuit.ts` | Circuit Builder | โมเดลวงจรแบบ ladder: อุปกรณ์ต่อ **อนุกรม** บนสาย หรือ **ขนาน** ลงกราวด์ + สเปกอุปกรณ์/พารามิเตอร์ |
| `solver.ts` | Circuit Solver | เดินจากปลายวงจรกลับมาที่ Source คำนวณ Z ทุกโหนด และ path บน Γ-plane ของแต่ละอุปกรณ์ |
| `rf.ts` | RF Engine | normalize, Γ, SWR, return loss, admittance, สมการสายส่ง (รองรับ loss), สตับ |
| `smith.ts` | Smith Chart Engine | เรขาคณิตวงกลม r / x / g / b, สเกล wavelengths toward generator |
| `explain.ts` | Explanation Engine | สร้างขั้นตอนอธิบายภาษาไทย + KaTeX พร้อม hint ไฮไลต์บน Smith Chart |
| `matching.ts` | Matching helpers | สูตร λ/4, single stub (Pozar §5.2), double stub (§5.3), L-section (§5.1) |
| `lessons.ts` | Guided Lab | บทเรียน 14 ระดับ (มี check อัตโนมัติ) และวงจรตัวอย่าง 10 วงจร |

### โมเดลวงจร

- `Source ── [อุปกรณ์…] ── return` อุปกรณ์อนุกรมตัวสุดท้ายต่อกลับลงกราวด์ (ลัดวงจรที่ปลาย) ถ้าตัวสุดท้ายเป็นแบบขนาน ปลายสายจะเป็น open
- **ส่วนท้าย** ที่เป็นอุปกรณ์ lumped ติดกัน (หรือบล็อก `Load Z_L`) ถูกมองเป็น "โหลด" (จุดสีแดง) ส่วนที่เหลือคือ matching network ที่แปลงอิมพีแดนซ์ทีละขั้น (จุดสีส้ม) ไปจนถึง `z_in` (จุดสีเขียว)
- อุปกรณ์อนุกรม → เดินตามวงกลม r คงที่, อุปกรณ์ขนาน/สตับ → เดินตามวงกลม g คงที่, สายส่ง → หมุนตามวงกลม SWR คงที่

## ฟีเจอร์

- ลากวาง (drag & drop) จากแผงซ้าย: วาง **บนสาย** = อนุกรม, วาง **ใต้สาย ⏚** = ขนานลงกราวด์ · ลากอุปกรณ์บน Canvas เพื่อสลับตำแหน่ง
- คลิกอุปกรณ์แล้วปรับค่าด้วยช่องตัวเลข + สไลเดอร์ (log scale สำหรับ L, C, f) จุดบน Smith Chart ขยับทันที
- ความถี่และ Z₀ ของระบบตั้งได้ที่แถบบน Canvas หรือคลิก RF Source
- Smith Chart แบบแผ่นจริง: กริด r/x และ g/b 5 ระดับความละเอียด (ถึง 0.01 ใกล้ SHORT ตัดเส้นย่อยในบริเวณหนาแน่นแบบแผ่นพิมพ์) ป้ายตัวเลขทุกวงบนแกนและรอบขอบ สเกลรอบนอก 3 วง (มุมของ Γ ทุก 2°/10°, wavelengths toward generator และ toward load ขีดทุก 0.002 λ ป้ายทุก 0.02 λ) แถบ radially scaled parameters (|Γ| ↔ SWR ↔ return loss ↔ กำลังสะท้อน %) พร้อม marker |Γ_L| และ |Γ_in| (แสดงอัตโนมัติเมื่อขยายแผง) ปุ่มสลับ "กริดละเอียด" และ hover อ่านค่า z, Z, y, Y, Γ, SWR, RL, ระยะ λ ทั้งสองทิศ
- **Explain this circuit**: อธิบายทีละขั้น (ไล่ทีละ step หรือเล่นอัตโนมัติ) แต่ละขั้นไฮไลต์อุปกรณ์บน Canvas และวงกลม r / x / g, จุด, วงกลม SWR บน Smith Chart
- Transmission line: **Probe** เลื่อนตำแหน่งวัดบนสาย + กราฟคลื่นนิ่ง |V|, |I|
- λ/4 transformer: ปุ่ม Auto Z_t · สตับ: สไลเดอร์ตำแหน่ง d + ปุ่มเฉลย single stub
- BEFORE / AFTER matching และป้าย ✓ MATCHED
- Guided Lab (14 ระดับ มี check ทีละขั้น) และ Free Circuit Builder · วงจรตัวอย่างสำเร็จรูป
- **เฉลยแบบครูสอน** (`src/engine/solutions.ts`): ตารางค่าเฉลยเทียบค่าของผู้เรียน (✓/✗), ปุ่ม "เติมค่าเฉลยถัดไป" ใส่ทีละค่าเพื่อดูจุดบน Smith Chart ขยับ, "ใช้เฉลย + อธิบายทีละขั้น", และหน้า "วิธีทำ" ที่แสดงการคำนวณตามสูตรในหนังสือของแต่ละบทเรียน พร้อม **วงจรเฉลย** (แผนผังวงจรคำตอบที่มีค่ากำกับและ ✓/✗ เทียบวงจรของผู้เรียน) และ Smith Chart ย่อของทั้งวงจรของผู้เรียนและวงจรเฉลย (deep link `&solution=1` หรือ `&solution=modal`)
- แหล่งจ่ายที่ไม่ใช่ 50 Ω: ตั้ง Z₀ = Z_S (กล่อง Z_S แสดงอยู่ที่แหล่งจ่ายบน Canvas) เช่น Example 11 / โจทย์ Y-6: Z_S = 25 Ω → Z_L = 400 Ω ที่ 1 GHz ด้วย L-section (L = 15.4 nH, C = 1.54 pF) พร้อมวิธีทำแบบ Q = √(R_L/R_S − 1)
- **โจทย์ฝึกหัด Z / Y** (`PROBLEMS` ใน `src/engine/lessons.ts`): ชุด Impedance 5 ข้อ (normalize, ออกแบบ RC, denormalize ที่ Z₀ = 75 Ω, z_in ที่ต้นสาย, λ/4) และชุด Admittance 5 ข้อ (y = 1/z แล้ว match ด้วย C ขนาน, Y ของสายอากาศ, RL ขนาน, single stub, L-section) แต่ละข้อมีช่องกรอกคำตอบตัวเลขที่ตรวจอัตโนมัติ (ค่าเฉลยคำนวณจากวงจรเฉลยด้วย engine) และให้สร้างวงจรตามโจทย์ พร้อมเฉลย/วิธีทำ/วิธีทำบน Smith Chart (deep link `?problem=py4`, `?modal=problems`)
- **วิธีทำบน Smith Chart** (`src/engine/smithMethod.ts`): ขั้นตอนเชิงกราฟตามหนังสือของวงจรเฉลย (พล็อต z_L → วงกลม SWR → y_L → หมุนตามสเกล λ → ตัดวงกลม g = 1 → หาความยาวสตับจากขอบกราฟ → เข้าศูนย์กลาง) แต่ละขั้นไฮไลต์จุด/เส้นทาง/วงกลม/สเกล λ บน Smith Chart หลักด้วยสีชมพู (deep link `&sstep=N`)
- ปุ่ม **⤢ ขยาย** ที่หัวทุกแผง ขยายแผงนั้นเต็มจอ (กด Esc หรือ ⤡ ย่อกลับ) เหมาะกับการฉายในห้องเรียน · จอเตี้ยกว่า 880px หน้าจะเลื่อนได้แทนการตัดเนื้อหา
- Deep link: `?example=ex7` `?lesson=l10` `&step=5` `&all=1` `&y=1` `&sel=0&probe=0.1` `&max=chart` (palette / inspector / canvas / chart / explain)

## สถานะตามแผน 3 ระยะ

- **Phase 1** (ครบ): Series R/L/C, ความถี่, Z_L, Normalize, Smith Chart, SWR, step-by-step
- **Phase 2** (ครบ): Parallel RLC / Admittance, Transmission Line + Probe + คลื่นนิ่ง, Quarter-Wave Transformer
- **Phase 3** (ครบในรูปแบบพื้นฐาน): Shunt short/open stub, Double stub, L-match, π/T, Free Circuit Builder แบบ ladder (ยังไม่ใช่การลากสายอิสระแบบ SPICE ตามที่ตั้งใจ)
