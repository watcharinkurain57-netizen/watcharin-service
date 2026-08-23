<#
    CoreSync — ตัวจำลองระบบ SCADA (สำหรับสาธิตเมื่อยังไม่ได้ต่อของจริง)

    ทำหน้าที่แทน "ระบบเดิมของโรงงานที่ export ไฟล์ออกมา" เท่านั้น
    เขียนไฟล์ CSV ทับตัวเองเรื่อย ๆ เหมือน historian ที่ dump ค่าล่าสุดออกมาเป็นรอบ

    ⚠️ ตัวนี้ไม่ได้ส่งอะไรออกจากเครื่องเลย มันเขียนไฟล์อย่างเดียว
    คนที่ส่งคือ coresync-connector.ps1 ซึ่งเป็นคนละโปรแกรม — แยกกันโดยตั้งใจ
    เพื่อให้เห็นชัดว่าเส้นแบ่งอยู่ตรงไหน: ฝั่งซ้ายคือของโรงงาน ฝั่งขวาคือของเรา

    สิ่งที่จำลอง (ยกพฤติกรรมมาจาก MockAdapter ของระบบจริง)
      - ระดับไซโลลดลงตามอัตราที่เตากิน แล้วเด้งขึ้นเมื่อมีการเติม
      - เตาเดิน/หยุดสลับกันเป็นคาบ — ตอนเตาหยุด อุณหภูมิจะไหลลง
      - ค่า status ส่งเป็นคำดิบภาษาไทย ('ปกติ' / 'เต็ม') ระบบไม่ตีความให้

    ตัวอย่างการใช้งาน
      .\coresync-mock-scada.ps1                                  # เขียน .\scada-export.csv ทุก 2 วินาที
      .\coresync-mock-scada.ps1 -Path "C:\export\tags.csv"
      .\coresync-mock-scada.ps1 -Silos 6 -IntervalSeconds 1

    แล้วเปิดอีกหน้าต่างหนึ่งรันตัวเชื่อมต่อชี้มาที่ไฟล์เดียวกัน
      .\coresync-connector.ps1 -Token "..." -Path "C:\export\tags.csv"
#>

[CmdletBinding()]
param(
    [string]$Path = ".\scada-export.csv",

    # ระบบจริงอ่านทุก 1 วินาที — ตั้งได้แต่ไม่ควรถี่กว่านั้นเพราะไม่ได้ข้อมูลเพิ่ม
    [int]$IntervalSeconds = 2,

    # จำนวนไซโล — ตั้งให้ตรงกับโรงงานที่จะสาธิตได้
    [int]$Silos = 3,

    # เกณฑ์ระดับต่ำ ส่งไปกับข้อมูลด้วยเพื่อให้หน้าจอรู้ว่าเส้นแบ่งอยู่ตรงไหน
    [double]$ThresholdPct = 30,

    # ชื่อนำหน้าไซโลกับเตา เปลี่ยนให้เหมือนของลูกค้าได้
    [string]$SiloPrefix = "KK",
    [string]$KilnPrefix = "CG"
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------
# ตั้งค่าเริ่มต้นของโรงงานสมมติ
# ------------------------------------------------------------------
$level = @{}
$drain = @{}
for ($i = 1; $i -le $Silos; $i++) {
    $id = "$SiloPrefix$i"
    # เริ่มที่ระดับต่างกัน เพื่อให้ไม่ตกต่ำกว่าเกณฑ์พร้อมกันทุกตัวจนดูปลอม
    $level[$id] = 45 + ($i * 13) % 40
    # แต่ละไซโลป้อนเตาคนละตัว อัตราการกินจึงไม่เท่ากัน
    $drain[$id] = 0.6 + (0.35 * (($i % 3) + 1))
}

$kilns = @("${KilnPrefix}1", "${KilnPrefix}2")
$kilnTemp = @{ "${KilnPrefix}1" = 995.0; "${KilnPrefix}2" = 1002.0 }
$kilnRunning = @{ "${KilnPrefix}1" = $true; "${KilnPrefix}2" = $true }

$tick = 0

function Write-Snapshot {
    <# เขียนค่าล่าสุดทับไฟล์เดิม — historian ส่วนใหญ่ทำแบบนี้
       ตัวเชื่อมต่ออ่านแถวสุดท้ายอยู่แล้ว จึงเข้ากันได้ทั้งแบบทับและแบบต่อท้าย #>

    $headers = New-Object System.Collections.ArrayList
    $values = New-Object System.Collections.ArrayList

    [void]$headers.Add("Timestamp")
    [void]$values.Add((Get-Date).ToString("s"))

    foreach ($id in ($level.Keys | Sort-Object)) {
        $pct = [math]::Round($level[$id], 1)
        [void]$headers.Add("${id}_LEVEL");     [void]$values.Add($pct)
        [void]$headers.Add("${id}_THRESHOLD"); [void]$values.Add($ThresholdPct)
        # คำดิบจากระบบเดิม — ไม่ใช่ข้อสรุปของเรา หน้าจอจะแสดงตามนี้ตรง ๆ
        $status = if ($pct -ge 80) { "เต็ม" } else { "ปกติ" }
        [void]$headers.Add("${id}_STATUS");    [void]$values.Add($status)
    }

    foreach ($k in $kilns) {
        [void]$headers.Add("${k}_TEMP")
        [void]$values.Add([math]::Round($kilnTemp[$k], 1))
    }

    $line = ($headers -join ",") + "`n" + ($values -join ",")
    # UTF8 เพราะค่า status เป็นภาษาไทย ถ้าเขียนด้วย codepage เดิมจะเพี้ยนตอนอ่านกลับ
    $line | Out-File -FilePath $Path -Encoding utf8
}

function Step-Plant {
    $script:tick++

    # ---- เตา: สลับเดิน/หยุดเป็นคาบ เพื่อให้เห็นผลตอนหยุดด้วย ----
    foreach ($k in $kilns) {
        # คาบไม่เท่ากันสองเตา จะได้ไม่หยุดพร้อมกัน
        $period = if ($k -eq $kilns[0]) { 90 } else { 130 }
        $kilnRunning[$k] = (($script:tick % $period) -lt ($period * 0.75))

        if ($kilnRunning[$k]) {
            $target = if ($k -eq $kilns[0]) { 997 } else { 1003 }
            $kilnTemp[$k] += ($target - $kilnTemp[$k]) * 0.15 + (Get-Random -Minimum -8 -Maximum 8) / 10
        }
        else {
            # เตาหยุด อุณหภูมิไหลลงช้า ๆ — จุดนี้คือสิ่งที่ระบบจริงใช้ระงับการแจ้งเตือน
            $kilnTemp[$k] -= 2.5
        }
    }

    # ---- ไซโล: ลดลงตามการกิน แล้วเติมเมื่อต่ำมาก ----
    $anyRunning = $kilnRunning.Values -contains $true
    foreach ($id in @($level.Keys)) {
        if ($anyRunning) {
            $level[$id] -= $drain[$id]
        }
        if ($level[$id] -lt 8) {
            # เติมกลับขึ้นไป ไม่เท่ากันทุกครั้ง เพื่อให้กราฟดูเป็นของจริง
            $level[$id] = 72 + (Get-Random -Minimum 0 -Maximum 15)
        }
        if ($level[$id] -gt 100) { $level[$id] = 100 }
    }
}

# ------------------------------------------------------------------
Write-Host ""
Write-Host "CoreSync — ตัวจำลองระบบ SCADA" -ForegroundColor Cyan
Write-Host "ไฟล์ที่เขียน : $Path"
Write-Host "ไซโล         : $Silos ตัว (เกณฑ์ต่ำ $ThresholdPct%)"
Write-Host "อัปเดตทุก    : $IntervalSeconds วินาที   (กด Ctrl+C เพื่อหยุด)"
Write-Host ""
Write-Host "เปิดอีกหน้าต่างแล้วรันตัวเชื่อมต่อชี้มาที่ไฟล์นี้ เพื่อส่งขึ้นไปแสดงผล" -ForegroundColor DarkGray
Write-Host ""

while ($true) {
    Step-Plant
    Write-Snapshot
    $summary = ($level.Keys | Sort-Object | ForEach-Object { "$_=$([math]::Round($level[$_],1))%" }) -join "  "
    $kilnState = ($kilns | ForEach-Object { "$_=$(if ($kilnRunning[$_]) { 'เดิน' } else { 'หยุด' })" }) -join "  "
    Write-Host ("[{0}] {1}   {2}" -f (Get-Date).ToString("HH:mm:ss"), $summary, $kilnState)
    Start-Sleep -Seconds $IntervalSeconds
}
